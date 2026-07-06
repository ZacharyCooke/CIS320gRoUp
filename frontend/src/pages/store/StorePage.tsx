import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { AdBanner } from "../../components/AdBanner";

interface Product {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  pet_type: string;
}

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "id_tags", label: "ID Tags" },
  { key: "gps_trackers", label: "GPS Trackers" },
  { key: "first_aid", label: "First Aid" }
];

export function StorePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("");
  const [petType, setPetType] = useState("");
  const [maxPrice, setMaxPrice] = useState(10000);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    apiClient.get("/auth/me").then(({ data }) => setIsPremium(Boolean(data.user?.is_premium))).catch(() => setIsPremium(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (petType) params.set("pet_type", petType);
    params.set("max_price_cents", String(maxPrice));
    apiClient.get(`/store/products?${params}`).then(({ data }) => setProducts(data.products));
  }, [category, petType, maxPrice]);

  return (
    <section style={{ padding: "1.5rem", maxWidth: 960, margin: "0 auto" }}>
      <Link to="/dashboard">← Dashboard</Link>
      <h1>Store</h1>

      <div style={{ marginBottom: 16 }}>
        <AdBanner slot="banner" />
      </div>

      {isPremium === false && (
        <div style={{
          background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10,
          padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <strong>Go Premium</strong>
            <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#4338ca" }}>
              Remove ads, unlock unlimited pet profiles, and priority search.
            </p>
          </div>
          <button type="button" onClick={() => navigate("/store/premium")}>Upgrade</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "2rem" }}>
        <aside style={{ width: 180 }}>
          <h3 style={{ fontSize: "0.9rem" }}>Category</h3>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              style={{
                display: "block", width: "100%", textAlign: "left", marginBottom: 4,
                background: category === c.key ? "#0f766e" : "transparent",
                color: category === c.key ? "#fff" : "#111827", border: "1px solid #e5e7eb"
              }}
            >
              {c.label}
            </button>
          ))}

          <h3 style={{ fontSize: "0.9rem", marginTop: 16 }}>Pet type</h3>
          <select value={petType} onChange={(e) => setPetType(e.target.value)} style={{ width: "100%" }}>
            <option value="">Any</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
          </select>

          <h3 style={{ fontSize: "0.9rem", marginTop: 16 }}>Max price: ${(maxPrice / 100).toFixed(0)}</h3>
          <input type="range" min={500} max={10000} step={100} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} style={{ width: "100%" }} />
        </aside>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {products.map((p) => (
            <div key={p.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
              <strong>{p.name}</strong>
              <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>{p.category.replace("_", " ")}</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>${(p.price_cents / 100).toFixed(2)}</div>
            </div>
          ))}
          {products.length === 0 && <p style={{ color: "#6b7280" }}>No products match these filters.</p>}
        </div>
      </div>
    </section>
  );
}
