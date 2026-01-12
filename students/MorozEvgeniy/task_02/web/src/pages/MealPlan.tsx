import { useEffect, useState } from "react";
import { mealPlanApi } from "../shared/api/mealplan.api";
import { Page } from "../shared/layout/Page";

type MealType = "breakfast" | "lunch" | "dinner";

type MealPlanItem = {
  id: string;
  mealType: MealType;
  recipe: {
    id: string;
    title: string;
  };
};

export default function MealPlan() {
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
  
    const load = async () => {
      setLoading(true);
      setError("");
  
      try {
        const res = await mealPlanApi.getByDate(date);
        if (!cancelled) {
          setItems(res.data.data);
        }
      } catch {
        if (!cancelled) {
          setError("Не удалось загрузить план питания");
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
  

  const renderMeal = (type: MealType, label: string) => {
    const meal = items.find((i) => i.mealType === type);

    return (
      <div style={{ marginBottom: 16 }}>
        <h3>{label}</h3>
        {meal ? (
          <p>{meal.recipe.title}</p>
        ) : (
          <p style={{ opacity: 0.6 }}>Не запланировано</p>
        )}
      </div>
    );
  };

  return (
    <Page>
      <h1>План питания</h1>
  
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="date-input"
      />
  
      {loading && <p className="loading">Загрузка…</p>}
      {error && <div className="error">{error}</div>}
  
      {!loading && !error && (
        <>
          {renderMeal("breakfast", "Завтрак")}
          {renderMeal("lunch", "Обед")}
          {renderMeal("dinner", "Ужин")}
        </>
      )}
    </Page>
  );
}
