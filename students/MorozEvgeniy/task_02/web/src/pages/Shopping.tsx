import { useEffect, useState } from "react";
import { shoppingApi } from "../shared/api/shopping.api";
import { Page } from "../shared/layout/Page";

type Item = {
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  isBought: boolean;
};

export default function Shopping() {
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await shoppingApi.getByDate(date);
        if (!cancelled) {
          setItems(res.data.data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <Page>
      <h1>Список покупок</h1>

      {/* FILTER */}
      <div className="card shopping-filter">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* LIST */}
      <div className="card shopping-card">
        {loading && <p className="loading">Загрузка…</p>}

        {!loading && items.length === 0 && (
          <p className="empty">Список покупок пуст</p>
        )}

        {!loading && items.length > 0 && (
          <ul className="shopping-list">
            {items.map((i) => (
              <li
                key={i.ingredientId}
                className={`shopping-row ${i.isBought ? "done" : ""}`}
              >
                <span className="shopping-name">{i.name}</span>
                <span className="shopping-amount">
                  {i.amount} {i.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>

  );
}
