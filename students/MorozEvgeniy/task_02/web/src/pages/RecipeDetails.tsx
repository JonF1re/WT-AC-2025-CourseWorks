import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { recipesApi } from "../shared/api/recipes.api";
import { mealPlanApi } from "../shared/api/mealplan.api";
import type { RecipeDetails as RecipeType } from "../shared/api/recipes.api";
import { Page } from "../shared/layout/Page";

export default function RecipeDetails() {
  const { id } = useParams<{ id: string }>();

  const [recipe, setRecipe] = useState<RecipeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [mealType, setMealType] = useState<
    "breakfast" | "lunch" | "dinner"
  >("lunch");

  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!id) return;

    recipesApi
      .getById(id)
      .then((res) => setRecipe(res.data.data))
      .catch(() => setError("Не удалось загрузить рецепт"))
      .finally(() => setLoading(false));
  }, [id]);

  const addToMealPlan = async () => {
    if (!recipe) return;

    setAdding(true);
    setError("");
    setSuccess("");

    try {
      await mealPlanApi.add({
        recipeId: recipe.id,
        date,
        mealType,
      });
      setSuccess("Рецепт добавлен в план питания");
    } catch {
      setError("Рецепт уже добавлен на эту дату");
    } finally {
      setAdding(false);
    }
  };

  if (loading)
    return (
      <Page>
        <p className="loading">Загрузка…</p>
      </Page>
    );

  if (error)
    return (
      <Page>
        <div className="error">{error}</div>
      </Page>
    );

  if (!recipe)
    return (
      <Page>
        <p>Рецепт не найден</p>
      </Page>
    );

  return (
    <Page>
      {/* ===== CONTENT ===== */}
      <div className="recipe-stack">
        {/* HEADER */}
        <div className="card recipe-header">
          <h1>{recipe.title}</h1>

          {recipe.description && (
            <p className="muted">{recipe.description}</p>
          )}

          <div className="meta">
            ⏱ {recipe.prepTime} мин · 🍽 {recipe.servings} порций
          </div>
        </div>

        {/* INGREDIENTS */}
        <div className="card">
          <h2>Ингредиенты</h2>

          <ul className="ingredients">
            {recipe.ingredients.map((i) => (
              <li key={i.id}>
                <span>{i.ingredient.name}</span>
                <span className="muted">
                  {i.amount} {i.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* INSTRUCTIONS */}
        <div className="card">
          <h2>Инструкция</h2>

          <div className="instructions">
            {recipe.instructions
              .split("\n")
              .filter(Boolean)
              .map((step, idx) => (
                <p key={idx}>
                  <strong>{idx + 1}.</strong> {step}
                </p>
              ))}
          </div>
        </div>
      </div>

      {/* ===== ACTION ===== */}
      <div className="card recipe-action">
        <h2>Добавить в план питания</h2>

        <div className="mealplan-form">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <select
            value={mealType}
            onChange={(e) =>
              setMealType(
                e.target.value as "breakfast" | "lunch" | "dinner"
              )
            }
          >
            <option value="breakfast">Завтрак</option>
            <option value="lunch">Обед</option>
            <option value="dinner">Ужин</option>
          </select>

          <button onClick={addToMealPlan} disabled={adding}>
            {adding ? "Добавление…" : "Добавить"}
          </button>
        </div>

        {success && <div className="success">{success}</div>}
        {error && <div className="error">{error}</div>}
      </div>
    </Page>
  );
}
