"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Business = {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  currency: string;
  createdAt: string;
  status: "active" | "suspended";
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "super-admin";
  businessId: string | null;
};

type Account = AuthUser & { passwordHash: string };
type Registry = { businesses: Business[]; accounts: Account[] };
type Session = {
  userId: string;
  role: AuthUser["role"];
  businessId: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  business: Business | null;
  businesses: Business[];
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    name: string;
    businessName: string;
    email: string;
    password: string;
    currency: string;
  }) => Promise<void>;
  openDemoBusiness: () => void;
  openAdminPreview: () => void;
  signOut: () => void;
  setBusinessStatus: (businessId: string, status: Business["status"]) => void;
};

const REGISTRY_KEY = "stockora-accounts-v1";
const SESSION_KEY = "stockora-session-v1";
export const DEMO_BUSINESS_ID = "demo-brightstone";

function demoBusiness(): Business {
  return {
    id: DEMO_BUSINESS_ID,
    name: "BrightStone Merchants",
    ownerName: "Sample owner",
    ownerEmail: "demo@stockora.local",
    currency: "GHS",
    createdAt: "2026-10-18T12:00:00.000Z",
    status: "active",
  };
}

function makeDefaultRegistry(): Registry {
  return { businesses: [demoBusiness()], accounts: [] };
}

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function publicUser(account: Account): AuthUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    businessId: account.businessId,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = useState<Registry>(makeDefaultRegistry);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const savedRegistry = window.localStorage.getItem(REGISTRY_KEY);
      const parsed = savedRegistry
        ? (JSON.parse(savedRegistry) as Partial<Registry>)
        : {};
      const defaults = makeDefaultRegistry();
      const businesses = Array.isArray(parsed.businesses)
        ? parsed.businesses
        : defaults.businesses;
      const accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
      const nextRegistry = {
        businesses: businesses.some(
          (business) => business.id === DEMO_BUSINESS_ID,
        )
          ? businesses
          : [defaults.businesses[0], ...businesses],
        accounts,
      };
      // Browser storage is the external source of truth during client hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRegistry(nextRegistry);

      const savedSession = window.localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const session = JSON.parse(savedSession) as Session;
        if (session.role === "super-admin") {
          setUser({
            id: "preview-admin",
            name: "Platform administrator",
            email: "admin-preview@stockora.local",
            role: "super-admin",
            businessId: null,
          });
        } else {
          const account = accounts.find(
            (item) =>
              item.id === session.userId &&
              item.businessId === session.businessId,
          );
          const business = nextRegistry.businesses.find(
            (item) => item.id === account?.businessId,
          );
          if (account && business?.status === "active")
            setUser(publicUser(account));
          else window.localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      setRegistry(makeDefaultRegistry());
      window.localStorage.removeItem(SESSION_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready)
      window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  }, [ready, registry]);

  const setSession = useCallback((nextUser: AuthUser) => {
    const session: Session = {
      userId: nextUser.id,
      role: nextUser.role,
      businessId: nextUser.businessId,
    };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(nextUser);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const account = registry.accounts.find(
        (item) => item.email === email.trim().toLowerCase(),
      );
      if (!account || account.passwordHash !== (await hashPassword(password))) {
        throw new Error("Email or password is incorrect.");
      }
      const business = registry.businesses.find(
        (item) => item.id === account.businessId,
      );
      if (!business || business.status !== "active") {
        throw new Error(
          "This business account is suspended. Contact the platform team.",
        );
      }
      setSession(publicUser(account));
    },
    [registry, setSession],
  );

  const signUp = useCallback(
    async (input: {
      name: string;
      businessName: string;
      email: string;
      password: string;
      currency: string;
    }) => {
      const email = input.email.trim().toLowerCase();
      if (registry.accounts.some((account) => account.email === email)) {
        throw new Error("An account with this email already exists.");
      }
      if (input.password.length < 8)
        throw new Error("Use a password with at least 8 characters.");

      const businessId = crypto.randomUUID();
      const account: Account = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        email,
        role: "owner",
        businessId,
        passwordHash: await hashPassword(input.password),
      };
      const business: Business = {
        id: businessId,
        name: input.businessName.trim(),
        ownerName: input.name.trim(),
        ownerEmail: email,
        currency: input.currency,
        createdAt: new Date().toISOString(),
        status: "active",
      };
      setRegistry((current) => ({
        businesses: [...current.businesses, business],
        accounts: [...current.accounts, account],
      }));
      setSession(publicUser(account));
    },
    [registry.accounts, setSession],
  );

  const openDemoBusiness = useCallback(() => {
    if (
      registry.businesses.some(
        (business) =>
          business.id === DEMO_BUSINESS_ID && business.status === "suspended",
      )
    )
      return;
    setSession({
      id: "demo-owner",
      name: "Sample owner",
      email: "demo@stockora.local",
      role: "owner",
      businessId: DEMO_BUSINESS_ID,
    });
  }, [registry.businesses, setSession]);

  const openAdminPreview = useCallback(() => {
    setSession({
      id: "preview-admin",
      name: "Platform administrator",
      email: "admin-preview@stockora.local",
      role: "super-admin",
      businessId: null,
    });
  }, [setSession]);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const setBusinessStatus = useCallback(
    (businessId: string, status: Business["status"]) => {
      setRegistry((current) => ({
        ...current,
        businesses: current.businesses.map((business) =>
          business.id === businessId ? { ...business, status } : business,
        ),
      }));
    },
    [],
  );

  const business = useMemo(
    () =>
      registry.businesses.find((item) => item.id === user?.businessId) ?? null,
    [registry.businesses, user?.businessId],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      business,
      businesses: registry.businesses,
      ready,
      signIn,
      signUp,
      openDemoBusiness,
      openAdminPreview,
      signOut,
      setBusinessStatus,
    }),
    [
      user,
      business,
      registry.businesses,
      ready,
      signIn,
      signUp,
      openDemoBusiness,
      openAdminPreview,
      signOut,
      setBusinessStatus,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
