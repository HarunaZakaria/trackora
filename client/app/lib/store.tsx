"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  stock: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  balance: number;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  balance: number;
};

export type Sale = {
  id: string;
  receipt: string;
  customer: string;
  lines: {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  total: number;
  amountPaid: number;
  paymentMethod: string;
  createdAt: string;
};

export type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  method: string;
};

export type Purchase = {
  id: string;
  invoice: string;
  supplier: string;
  productId: string;
  productName: string;
  quantity: number;
  total: number;
  status: "Received" | "Pending";
  date: string;
};

type Store = {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  expenses: Expense[];
  purchases: Purchase[];
  businessName: string;
  currency: string;
  currentTime: string;
  preferences: {
    lowStockAlerts: boolean;
    receiptNumbering: boolean;
    supplierReminders: boolean;
    darkMode: boolean;
  };
  ready: boolean;
  storageError: string | null;
  setBusiness: (name: string, currency: string) => void;
  setPreference: (key: keyof Store["preferences"], value: boolean) => void;
  saveProduct: (product: Omit<Product, "id">, id?: string) => void;
  deleteProduct: (id: string) => void;
  saveCustomer: (customer: Omit<Customer, "id">, id?: string) => void;
  saveSupplier: (supplier: Omit<Supplier, "id">, id?: string) => void;
  saveExpense: (expense: Omit<Expense, "id">) => void;
  deleteExpense: (id: string) => void;
  createPurchase: (purchase: Omit<Purchase, "id" | "invoice" | "date">) => void;
  receivePurchase: (id: string) => void;
  checkout: (
    lines: { productId: string; quantity: number }[],
    customer: string,
    amountPaid: number,
    paymentMethod: string,
  ) => string;
  clearDemoData: () => void;
};

const STORAGE_KEY = "stockora-demo-v1";
const SERVER_TIME = "2026-10-18T12:00:00.000Z";
let browserTime = SERVER_TIME;

function subscribeToClock(onChange: () => void) {
  const updateTime = () => {
    browserTime = new Date().toISOString();
    onChange();
  };
  updateTime();
  const interval = window.setInterval(updateTime, 60_000);
  return () => window.clearInterval(interval);
}

function getBrowserTime() {
  return browserTime;
}

function getServerTime() {
  return SERVER_TIME;
}

function seedStore(now: Date) {
  const today = now.toISOString().slice(0, 10);
  return {
    products: [
      {
        id: "p-cement",
        name: "Cement 50kg",
        sku: "CEM-050",
        category: "Building materials",
        unit: "Bag",
        stock: 132,
        reorderLevel: 30,
        costPrice: 72,
        sellingPrice: 95,
      },
      {
        id: "p-iron",
        name: "Iron Rod 12mm",
        sku: "IRO-012",
        category: "Steel",
        unit: "Piece",
        stock: 18,
        reorderLevel: 40,
        costPrice: 48,
        sellingPrice: 65,
      },
      {
        id: "p-roof",
        name: "Roofing sheet",
        sku: "ROF-120",
        category: "Sheets",
        unit: "Sheet",
        stock: 75,
        reorderLevel: 25,
        costPrice: 110,
        sellingPrice: 145,
      },
      {
        id: "p-brake",
        name: "Brake pad set",
        sku: "BRK-048",
        category: "Spare parts",
        unit: "Set",
        stock: 9,
        reorderLevel: 20,
        costPrice: 180,
        sellingPrice: 240,
      },
      {
        id: "p-oil",
        name: "Engine oil 4L",
        sku: "ENG-004",
        category: "Lubricants",
        unit: "Bottle",
        stock: 41,
        reorderLevel: 15,
        costPrice: 90,
        sellingPrice: 125,
      },
    ] satisfies Product[],
    customers: [
      {
        id: "c-abaana",
        name: "Abaana Builders",
        phone: "+233 20 101 0101",
        email: "",
        balance: 2190,
      },
      {
        id: "c-mawing",
        name: "Mawing Traders",
        phone: "+233 20 202 0202",
        email: "",
        balance: 840,
      },
      {
        id: "c-nimble",
        name: "Nimble Auto",
        phone: "+233 20 303 0303",
        email: "",
        balance: 5110,
      },
      {
        id: "c-zuria",
        name: "Zuria Motors",
        phone: "+233 20 404 0404",
        email: "",
        balance: 1680,
      },
    ] satisfies Customer[],
    suppliers: [
      {
        id: "s-solign",
        name: "Solign Supplies",
        contact: "Adu Mensah",
        phone: "+233 20 000 0000",
        email: "",
        balance: 12400,
      },
      {
        id: "s-biriak",
        name: "Biriak Ghana Ltd",
        contact: "Esi Tetteh",
        phone: "+233 24 111 2222",
        email: "",
        balance: 5060,
      },
      {
        id: "s-royal",
        name: "Royal Auto Spares",
        contact: "Kofi Asamoah",
        phone: "+233 27 222 3333",
        email: "",
        balance: 2180,
      },
      {
        id: "s-accra",
        name: "Accra Build Mart",
        contact: "Naa Aisha",
        phone: "+233 26 333 4444",
        email: "",
        balance: 8220,
      },
    ] satisfies Supplier[],
    sales: [
      {
        id: "sale-1048",
        receipt: "#1048",
        customer: "Abaana Builders",
        lines: [
          {
            productId: "p-cement",
            name: "Cement 50kg",
            quantity: 6,
            unitPrice: 95,
          },
        ],
        total: 570,
        amountPaid: 570,
        paymentMethod: "Cash",
        createdAt: new Date(now.getTime() - 1000 * 60 * 25).toISOString(),
      },
      {
        id: "sale-1049",
        receipt: "#1049",
        customer: "Baraka Hardware",
        lines: [
          {
            productId: "p-roof",
            name: "Roofing sheet",
            quantity: 4,
            unitPrice: 145,
          },
        ],
        total: 580,
        amountPaid: 400,
        paymentMethod: "Mobile money",
        createdAt: new Date(now.getTime() - 1000 * 60 * 95).toISOString(),
      },
      {
        id: "sale-1050",
        receipt: "#1050",
        customer: "Ghana Motors",
        lines: [
          {
            productId: "p-oil",
            name: "Engine oil 4L",
            quantity: 3,
            unitPrice: 125,
          },
        ],
        total: 375,
        amountPaid: 375,
        paymentMethod: "Card",
        createdAt: new Date(now.getTime() - 1000 * 60 * 180).toISOString(),
      },
    ] satisfies Sale[],
    expenses: [
      {
        id: "e-power",
        category: "Operations",
        description: "Electricity bill",
        amount: 820,
        date: today,
        method: "Bank transfer",
      },
      {
        id: "e-fuel",
        category: "Staff",
        description: "Vehicle fuel",
        amount: 540,
        date: today,
        method: "Cash",
      },
      {
        id: "e-pack",
        category: "Inventory",
        description: "Packaging materials",
        amount: 390,
        date: today,
        method: "Mobile money",
      },
      {
        id: "e-rent",
        category: "Rent",
        description: "Shop rent",
        amount: 2600,
        date: today,
        method: "Bank transfer",
      },
    ] satisfies Expense[],
    purchases: [
      {
        id: "po-811",
        invoice: "PO-811",
        supplier: "Solign Supplies",
        productId: "p-cement",
        productName: "Cement 50kg",
        quantity: 40,
        total: 2880,
        status: "Received",
        date: today,
      },
      {
        id: "po-812",
        invoice: "PO-812",
        supplier: "Royal Auto Spares",
        productId: "p-brake",
        productName: "Brake pad set",
        quantity: 12,
        total: 2160,
        status: "Pending",
        date: today,
      },
    ] satisfies Purchase[],
    businessName: "BrightStone Merchants",
    currency: "GHS",
    preferences: {
      lowStockAlerts: true,
      receiptNumbering: true,
      supplierReminders: false,
      darkMode: false,
    },
  };
}

function createBusinessStore(
  name: string,
  currency: string,
  sampleData: boolean,
): PersistedStore {
  const seeded = seedStore(new Date());
  if (sampleData) return { ...seeded, businessName: name, currency };
  return {
    ...seeded,
    products: [],
    customers: [],
    suppliers: [],
    sales: [],
    expenses: [],
    purchases: [],
    businessName: name,
    currency,
  };
}

type PersistedStore = ReturnType<typeof seedStore>;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({
  children,
  businessId,
  businessName,
  currency,
  sampleData,
}: {
  children: ReactNode;
  businessId: string;
  businessName: string;
  currency: string;
  sampleData: boolean;
}) {
  const storageKey = `${STORAGE_KEY}:${businessId}`;
  const [data, setData] = useState<PersistedStore>(() =>
    createBusinessStore(businessName, currency, sampleData),
  );
  const [ready, setReady] = useState(false);
  const currentTime = useSyncExternalStore(
    subscribeToClock,
    getBrowserTime,
    getServerTime,
  );
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(storageKey) ??
        (sampleData ? window.localStorage.getItem(STORAGE_KEY) : null);
      const restored = saved
        ? {
            ...createBusinessStore(businessName, currency, sampleData),
            ...(JSON.parse(saved) as Partial<PersistedStore>),
          }
        : createBusinessStore(businessName, currency, sampleData);
      // Browser storage is the external source of truth during client hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(restored);
    } catch {
      setStorageError(
        "Saved browser data could not be read. Demo data is being used.",
      );
    } finally {
      setReady(true);
    }
  }, [businessName, businessId, currency, sampleData, storageKey]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      window.setTimeout(
        () =>
          setStorageError(
            "Browser storage is unavailable. Changes may not persist after closing this page.",
          ),
        0,
      );
    }
  }, [data, ready, storageKey]);

  const saveProduct = useCallback(
    (product: Omit<Product, "id">, id?: string) => {
      setData((current) => ({
        ...current,
        products: id
          ? current.products.map((item) =>
              item.id === id ? { ...product, id } : item,
            )
          : [{ ...product, id: crypto.randomUUID() }, ...current.products],
      }));
    },
    [],
  );

  const saveCustomer = useCallback(
    (customer: Omit<Customer, "id">, id?: string) => {
      setData((current) => ({
        ...current,
        customers: id
          ? current.customers.map((item) =>
              item.id === id ? { ...customer, id } : item,
            )
          : [{ ...customer, id: crypto.randomUUID() }, ...current.customers],
      }));
    },
    [],
  );

  const saveSupplier = useCallback(
    (supplier: Omit<Supplier, "id">, id?: string) => {
      setData((current) => ({
        ...current,
        suppliers: id
          ? current.suppliers.map((item) =>
              item.id === id ? { ...supplier, id } : item,
            )
          : [{ ...supplier, id: crypto.randomUUID() }, ...current.suppliers],
      }));
    },
    [],
  );

  const value = useMemo<Store>(
    () => ({
      ...data,
      currentTime,
      ready,
      storageError,
      setBusiness: (name, currency) =>
        setData((current) => ({ ...current, businessName: name, currency })),
      setPreference: (key, value) =>
        setData((current) => ({
          ...current,
          preferences: { ...current.preferences, [key]: value },
        })),
      saveProduct,
      deleteProduct: (id) =>
        setData((current) => ({
          ...current,
          products: current.products.filter((item) => item.id !== id),
        })),
      saveCustomer,
      saveSupplier,
      saveExpense: (expense) =>
        setData((current) => ({
          ...current,
          expenses: [
            { ...expense, id: crypto.randomUUID() },
            ...current.expenses,
          ],
        })),
      deleteExpense: (id) =>
        setData((current) => ({
          ...current,
          expenses: current.expenses.filter((expense) => expense.id !== id),
        })),
      createPurchase: (purchase) =>
        setData((current) => ({
          ...current,
          purchases: [
            {
              ...purchase,
              id: crypto.randomUUID(),
              invoice: `PO-${Date.now().toString().slice(-5)}`,
              date: currentTime.slice(0, 10),
            },
            ...current.purchases,
          ],
          products: current.products.map((product) =>
            product.id === purchase.productId && purchase.status === "Received"
              ? { ...product, stock: product.stock + purchase.quantity }
              : product,
          ),
          suppliers: current.suppliers.map((supplier) =>
            supplier.name === purchase.supplier
              ? { ...supplier, balance: supplier.balance + purchase.total }
              : supplier,
          ),
        })),
      receivePurchase: (id) =>
        setData((current) => {
          const purchase = current.purchases.find((item) => item.id === id);
          if (!purchase || purchase.status === "Received") return current;
          return {
            ...current,
            purchases: current.purchases.map((item) =>
              item.id === id ? { ...item, status: "Received" } : item,
            ),
            products: current.products.map((product) =>
              product.id === purchase.productId
                ? { ...product, stock: product.stock + purchase.quantity }
                : product,
            ),
          };
        }),
      checkout: (lines, customer, amountPaid, paymentMethod) => {
        const byId = new Map(
          data.products.map((product) => [product.id, product]),
        );
        for (const line of lines) {
          const product = byId.get(line.productId);
          if (!product || line.quantity <= 0 || line.quantity > product.stock) {
            throw new Error(
              `${product?.name ?? "A selected product"} does not have enough stock.`,
            );
          }
        }
        const saleLines = lines.map((line) => {
          const product = byId.get(line.productId);
          if (!product)
            throw new Error("A selected product is no longer available.");
          return {
            productId: product.id,
            name: product.name,
            quantity: line.quantity,
            unitPrice: product.sellingPrice,
          };
        });
        const total = saleLines.reduce(
          (sum, line) => sum + line.quantity * line.unitPrice,
          0,
        );
        if (amountPaid < 0 || amountPaid > total)
          throw new Error("Payment must be between zero and the sale total.");
        const highestReceipt = Math.max(
          1000,
          ...data.sales.map(
            (sale) => Number(sale.receipt.replace("#", "")) || 0,
          ),
        );
        const receipt = data.preferences.receiptNumbering
          ? `#${highestReceipt + 1}`
          : `#${Date.now().toString().slice(-8)}`;
        const sale: Sale = {
          id: crypto.randomUUID(),
          receipt,
          customer: customer || "Walk-in customer",
          lines: saleLines,
          total,
          amountPaid,
          paymentMethod,
          createdAt: new Date().toISOString(),
        };
        setData((current) => ({
          ...current,
          sales: [sale, ...current.sales],
          products: current.products.map((product) => {
            const line = lines.find((item) => item.productId === product.id);
            return line
              ? { ...product, stock: product.stock - line.quantity }
              : product;
          }),
          customers: current.customers.map((item) =>
            item.name === customer
              ? { ...item, balance: item.balance + total - amountPaid }
              : item,
          ),
        }));
        return receipt;
      },
      clearDemoData: () =>
        setData(createBusinessStore(businessName, currency, sampleData)),
    }),
    [
      data,
      ready,
      currentTime,
      storageError,
      saveProduct,
      saveCustomer,
      saveSupplier,
      businessName,
      currency,
      sampleData,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider.");
  return value;
}

export function formatMoney(amount: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
