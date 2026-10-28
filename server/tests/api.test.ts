import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { hash } from "bcryptjs";

let replicaSet: MongoMemoryReplSet;
let app: import("express").Express;
let models: typeof import("../src/models");
let connectDatabase: typeof import("../src/config/database").connectDatabase;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_ACCESS_SECRET =
    "test-access-secret-at-least-thirty-two-characters";
  process.env.JWT_REFRESH_SECRET =
    "test-refresh-secret-at-least-thirty-two-characters";
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ launchTimeout: 60_000 }],
  });
  process.env.MONGODB_URI = replicaSet.getUri("stockora-test");
  const [appModule, modelModule, databaseModule] = await Promise.all([
    import("../src/app.js"),
    import("../src/models/index.js"),
    import("../src/config/database.js"),
  ]);
  models = modelModule;
  connectDatabase = databaseModule.connectDatabase;
  app = appModule.createApp();
  await connectDatabase(process.env.MONGODB_URI);
  await Promise.all(Object.values(models).map((model) => model.init()));
}, 180_000);

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replicaSet) await replicaSet.stop();
}, 30_000);

async function register(email: string, businessName: string) {
  const response = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "Test Owner",
      email,
      password: "test-password-12345",
      businessName,
      currency: "GHS",
    })
    .expect(201);
  return {
    token: response.body.data.accessToken as string,
    businessId: response.body.data.business.id as string,
  };
}

function productInput(name: string, sku: string, stock: number) {
  return {
    name,
    sku,
    category: "Hardware",
    unit: "piece",
    stock,
    reorderLevel: 1,
    costPrice: 3.25,
    sellingPrice: 5,
  };
}

describe("tenant-scoped API", () => {
  it("retries transient Atlas DNS timeouts but not permanent errors", async () => {
    const connectSpy = vi.spyOn(mongoose, "connect");
    const dnsTimeout = Object.assign(new Error("queryTxt ETIMEOUT"), {
      code: "ETIMEOUT",
    });
    connectSpy
      .mockRejectedValueOnce(dnsTimeout)
      .mockResolvedValueOnce(mongoose);

    await expect(
      connectDatabase("mongodb://retry-test"),
    ).resolves.toBeUndefined();
    expect(connectSpy).toHaveBeenCalledTimes(2);

    connectSpy.mockReset();
    connectSpy.mockRejectedValueOnce(new Error("Authentication failed"));
    await expect(connectDatabase("mongodb://retry-test")).rejects.toThrow(
      "Authentication failed",
    );
    expect(connectSpy).toHaveBeenCalledTimes(1);
    connectSpy.mockRestore();
  });

  it("uses TLS-enabled SRV seeds when only the Atlas TXT lookup times out", async () => {
    const connectSpy = vi.spyOn(mongoose, "connect");
    connectSpy
      .mockRejectedValueOnce(
        Object.assign(new Error("Atlas TXT resolution timed out"), {
          code: "ETIMEOUT",
          syscall: "queryTxt",
        }),
      )
      .mockResolvedValueOnce(mongoose);
    const srvResolver = vi.fn().mockResolvedValue([
      {
        name: "node-00.example.mongodb.net",
        port: 27017,
        priority: 0,
        weight: 0,
      },
      {
        name: "node-01.example.mongodb.net",
        port: 27017,
        priority: 0,
        weight: 0,
      },
    ]);

    await expect(
      connectDatabase(
        "mongodb+srv://owner:p%40ss@cluster.example.mongodb.net/?retryWrites=true",
        srvResolver,
      ),
    ).resolves.toBeUndefined();

    expect(srvResolver).toHaveBeenCalledWith(
      "_mongodb._tcp.cluster.example.mongodb.net",
    );
    expect(connectSpy).toHaveBeenCalledTimes(2);
    const fallbackUri = String(connectSpy.mock.calls[1]?.[0]);
    expect(fallbackUri).toContain(
      "owner:p%40ss@node-00.example.mongodb.net:27017",
    );
    expect(fallbackUri).toContain("node-01.example.mongodb.net:27017");
    expect(fallbackUri).toContain("tls=true");
    expect(fallbackUri).toContain("authSource=admin");
    connectSpy.mockRestore();
  });

  it("keeps products isolated across separately registered businesses", async () => {
    const first = await register("first@example.test", "First Hardware");
    const second = await register("second@example.test", "Second Hardware");
    const firstProduct = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${first.token}`)
      .send(productInput("First hammer", "HAM-1", 5))
      .expect(201);
    await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${second.token}`)
      .send(productInput("Second hammer", "HAM-1", 8))
      .expect(201);

    const firstList = await request(app)
      .get("/api/v1/products")
      .set("Authorization", `Bearer ${first.token}`)
      .expect(200);
    const secondList = await request(app)
      .get("/api/v1/products")
      .set("Authorization", `Bearer ${second.token}`)
      .expect(200);
    expect(
      firstList.body.data.map((product: { name: string }) => product.name),
    ).toEqual(["First hammer"]);
    expect(
      secondList.body.data.map((product: { name: string }) => product.name),
    ).toEqual(["Second hammer"]);
    await request(app)
      .get(`/api/v1/products/${firstProduct.body.data.id}`)
      .set("Authorization", `Bearer ${second.token}`)
      .expect(404);
    await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${second.token}`)
      .send({
        ...productInput("Forged tenant", "FORGED", 2),
        businessId: first.businessId,
      })
      .expect(400);
  });

  it("updates stock, customer balance, and payment ledger atomically for a sale", async () => {
    const owner = await register("sales@example.test", "Sales Hardware");
    const product = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${owner.token}`)
      .send(productInput("Pliers", "PLI-1", 5))
      .expect(201);
    const customer = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Corner Shop", creditLimit: 100 })
      .expect(201);
    const sale = await request(app)
      .post("/api/v1/sales")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        lines: [{ productId: product.body.data.id, quantity: 2 }],
        customerId: customer.body.data.id,
        amountPaid: 4,
        paymentMethod: "Cash",
      })
      .expect(201);
    expect(sale.body.data.total).toBe(10);
    expect(sale.body.data.balanceDue).toBe(6);
    expect((await models.Product.findById(product.body.data.id))?.stock).toBe(
      3,
    );
    expect(
      (await models.Customer.findById(customer.body.data.id))?.balanceMinor,
    ).toBe(600);
    expect(
      await models.StockMovement.countDocuments({
        businessId: owner.businessId,
        movementType: "sale",
      }),
    ).toBe(1);
    expect(
      await models.Payment.countDocuments({
        businessId: owner.businessId,
        saleId: sale.body.data.id,
      }),
    ).toBe(1);

    await request(app)
      .post(`/api/v1/sales/${sale.body.data.id}/returns`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        items: [{ productId: product.body.data.id, quantity: 1 }],
        reason: "Wrong size",
        restock: true,
      })
      .expect(201);
    expect((await models.Product.findById(product.body.data.id))?.stock).toBe(
      4,
    );
    expect(
      (await models.Customer.findById(customer.body.data.id))?.balanceMinor,
    ).toBe(100);
    await request(app)
      .post(`/api/v1/sales/${sale.body.data.id}/payments`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ amount: 1, method: "Mobile money" })
      .expect(201);
    expect(
      (await models.Customer.findById(customer.body.data.id))?.balanceMinor,
    ).toBe(0);
  });

  it("allows only a real platform admin to monitor and suspend a business", async () => {
    const owner = await register("managed@example.test", "Managed Store");
    const admin = await models.User.create({
      name: "Platform Admin",
      email: "root@example.test",
      passwordHash: await hash("root-password-12345", 12),
      platformRole: "super-admin",
    });
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: admin.email, password: "root-password-12345" })
      .expect(200);
    const adminToken = login.body.data.accessToken as string;

    await request(app).get("/api/v1/admin/overview").expect(401);
    const overview = await request(app)
      .get("/api/v1/admin/overview")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(overview.body.data.businesses).toBe(1);

    await request(app)
      .patch(`/api/v1/admin/businesses/${owner.businessId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "suspended", reason: "Billing review" })
      .expect(200);
    await request(app)
      .get("/api/v1/products")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(401);
    expect(
      await models.AuthSession.countDocuments({
        businessId: owner.businessId,
        revokedAt: { $ne: null },
      }),
    ).toBeGreaterThan(0);
  });
});
