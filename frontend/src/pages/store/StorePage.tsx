import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { AdRail } from "../../components/AdRail";
import { EmptyState } from "../../components/EmptyState";
import { NavBar } from "../../components/NavBar";
import { PublicTopBar } from "../../components/PublicTopBar";
import { Footer } from "../../components/Footer";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { isAuthenticated } from "../../services/auth";

type Category = "id_tags" | "gps_trackers" | "safety_gear";
type PetType = "dog" | "cat" | "small_pet";

interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;
  priceCents: number;
  originalPriceCents?: number;
  petTypes: PetType[];
  emoji: string;
  badge?: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  id_tags: "Pet ID & Tags",
  gps_trackers: "GPS Trackers",
  safety_gear: "Safety Gear"
};

const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: "Dogs",
  cat: "Cats",
  small_pet: "Small Pets"
};

// Static catalog — FR-034 only requires a browsable, filterable product grid;
// there's no Product/Order entity in data-model.md, so there is no real
// inventory or checkout behind these physical-good listings (the Premium tile
// below is the one real, functional purchase on this page).
const PRODUCTS: Product[] = [
  {
    id: "qr-smart-tag",
    name: "PetRecovery QR Smart Tag",
    description: "Scannable QR code links directly to your pet's PetRecovery profile.",
    category: "id_tags",
    priceCents: 1299,
    originalPriceCents: 1999,
    petTypes: ["dog", "cat", "small_pet"],
    emoji: "🏷",
    badge: "Best Seller"
  },
  {
    id: "gps-tracker",
    name: "Whistle Go Explore GPS Tracker",
    description: "Real-time GPS and activity monitoring, integrated with PetRecovery.",
    category: "gps_trackers",
    priceCents: 7995,
    petTypes: ["dog", "cat"],
    emoji: "📡",
    badge: "PetRecovery Compatible"
  },
  {
    id: "airtag-holder",
    name: "AirTag Collar Holder (3-Pack)",
    description: "Waterproof silicone holder attaches an Apple AirTag to any collar.",
    category: "gps_trackers",
    priceCents: 1499,
    petTypes: ["dog", "cat", "small_pet"],
    emoji: "🔖",
    badge: "New"
  },
  {
    id: "engraved-id-tag",
    name: "Engraved Stainless Steel ID Tag",
    description: "Custom engraved with pet name, owner phone, and PetRecovery profile URL.",
    category: "id_tags",
    priceCents: 999,
    petTypes: ["dog", "cat"],
    emoji: "🪪",
    badge: "Personalized"
  },
  {
    id: "first-aid-kit",
    name: "Pet First Aid Kit — Compact",
    description: "Bandages, antiseptic, emergency blanket, and a pet-safe pain relief guide.",
    category: "safety_gear",
    priceCents: 2499,
    petTypes: ["dog", "cat", "small_pet"],
    emoji: "🩺",
    badge: "Bundle"
  }
];

const PRICE_BANDS = [
  { id: "under25", label: "Under $25", test: (c: number) => c < 2500 },
  { id: "25to75", label: "$25 – $75", test: (c: number) => c >= 2500 && c <= 7500 },
  { id: "over75", label: "Over $75", test: (c: number) => c > 7500 }
] as const;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function StorePage() {
  const navigate = useNavigate();
  const authed = isAuthenticated();
  const { user, loading: userLoading, error: userError, refetch: refetchUser } = useCurrentUser();
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [priceBands, setPriceBands] = useState<Set<string>>(new Set());
  const [petTypes, setPetTypes] = useState<Set<PetType>>(new Set());
  const [cart, setCart] = useState<Record<string, number>>({});
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [subscribeBusy, setSubscribeBusy] = useState(false);

  const cartCount = useMemo(() => Object.values(cart).reduce((sum, n) => sum + n, 0), [cart]);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      if (activeCategory !== "all" && product.category !== activeCategory) return false;
      if (priceBands.size > 0) {
        const matchesBand = PRICE_BANDS.some((band) => priceBands.has(band.id) && band.test(product.priceCents));
        if (!matchesBand) return false;
      }
      if (petTypes.size > 0) {
        const matchesType = product.petTypes.some((t) => petTypes.has(t));
        if (!matchesType) return false;
      }
      return true;
    });
  }, [activeCategory, priceBands, petTypes]);

  function toggleSetValue<T>(set: Set<T>, value: T, setter: (next: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  function addToCart(productId: string) {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  }

  async function handleGetPremium() {
    if (!localStorage.getItem("access_token")) {
      navigate("/login");
      return;
    }
    setSubscribeError(null);
    setSubscribeBusy(true);
    try {
      const { data } = await apiClient.post("/store/subscribe");
      window.location.assign(data.checkout_url);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      setSubscribeError(
        e.response?.status === 503
          ? "Premium checkout isn't configured on this server yet."
          : "Failed to start Premium checkout."
      );
      setSubscribeBusy(false);
    }
  }

  const isPremium = user?.is_premium ?? false;

  return (
    <>
      {authed ? <NavBar /> : <PublicTopBar />}
      {!userLoading && <AdRail isPremium={isPremium} />}
      <section className="store-page">
        <div className="store-cart-row">
          <span className="cart-pill">🛒 Cart ({cartCount})</span>
        </div>

      {userError && (
        <p className="form-hint" role="alert">
          Could not confirm your Premium status right now — ads may show even if you're subscribed.{" "}
          <button type="button" className="btn-outline" onClick={refetchUser} style={{ marginLeft: 8 }}>
            Retry
          </button>
        </p>
      )}

      <div className="store-hero">
        <h1>🛍 PetRecovery Store</h1>
        <p>Everything you need to keep your pets safe, identified, and easy to find.</p>
        <div className="hero-badges">
          <span className="tag tag-teal">🚚 Free shipping over $35</span>
          <span className="tag tag-teal">↩ 30-day returns</span>
          <span className="tag tag-teal">✓ PetRecovery verified products</span>
        </div>
      </div>

      <div className="category-tabs">
        <button
          type="button"
          className={activeCategory === "all" ? "cat-tab active" : "cat-tab"}
          onClick={() => setActiveCategory("all")}
        >
          All Products
        </button>
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
          <button
            key={cat}
            type="button"
            className={activeCategory === cat ? "cat-tab active" : "cat-tab"}
            onClick={() => setActiveCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="store-main">
        <aside className="store-filters">
          <h3>Filter</h3>
          <div className="filter-group">
            <span className="filter-group-label">Price</span>
            {PRICE_BANDS.map((band) => (
              <label className="filter-item" key={band.id}>
                <input
                  type="checkbox"
                  checked={priceBands.has(band.id)}
                  onChange={() => toggleSetValue(priceBands, band.id, setPriceBands)}
                />
                {band.label}
              </label>
            ))}
          </div>
          <div className="filter-group">
            <span className="filter-group-label">Pet Type</span>
            {(Object.keys(PET_TYPE_LABELS) as PetType[]).map((type) => (
              <label className="filter-item" key={type}>
                <input
                  type="checkbox"
                  checked={petTypes.has(type)}
                  onChange={() => toggleSetValue(petTypes, type, setPetTypes)}
                />
                {PET_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
        </aside>

        <div>
          <div className="products-header">
            <h2>{filteredProducts.length} Products</h2>
          </div>

          {filteredProducts.length === 0 && (
            <EmptyState
              icon="🔍"
              message="No products match your filters. Try clearing some filters to see more."
              actionLabel="Clear Filters"
              onAction={() => {
                setActiveCategory("all");
                setPriceBands(new Set());
                setPetTypes(new Set());
              }}
            />
          )}

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <div className="product-card" key={product.id}>
                <div className="product-img">{product.emoji}</div>
                <div className="product-body">
                  {product.badge && <span className="tag tag-teal product-badge">{product.badge}</span>}
                  <div className="product-name">{product.name}</div>
                  <div className="product-desc">{product.description}</div>
                  <div className="product-footer">
                    <div className="product-price">
                      {product.originalPriceCents && (
                        <span className="original">{formatPrice(product.originalPriceCents)}</span>
                      )}
                      {formatPrice(product.priceCents)}
                    </div>
                    <button type="button" onClick={() => addToCart(product.id)}>Add to Cart</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="premium-banner">
            <div>
              <h3>⭐ Go Premium — Remove Ads & Unlock Everything</h3>
              <p>
                PetRecovery is free forever with ads. Premium removes all ads, adds unlimited pet
                profiles, priority database searches, and Facebook group auto-post.
              </p>
              <div className="premium-features">
                <span className="tag">✓ No ads</span>
                <span className="tag">✓ Unlimited pets</span>
                <span className="tag">✓ Priority search</span>
                <span className="tag">✓ Facebook group auto-post</span>
              </div>
              {subscribeError && <p role="alert" className="premium-error">{subscribeError}</p>}
            </div>
            {isPremium ? (
              <span className="tag tag-teal premium-active-badge">✓ You're Premium</span>
            ) : (
              <button type="button" className="btn-premium" onClick={handleGetPremium} disabled={subscribeBusy}>
                Get Premium
              </button>
            )}
          </div>
        </div>
      </div>
      </section>
      <Footer />
    </>
  );
}
