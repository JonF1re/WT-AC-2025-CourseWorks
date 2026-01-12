import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { recipesApi } from "../shared/api/recipes.api";
import { Page } from "../shared/layout/Page";

type IngredientInput = {
  customName: string;
  amount: number;
  unit: string;
};

export default function RecipeCreate() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState(10);
  const [servings, setServings] = useState(1);
  const [ingredientsText, setIngredientsText] = useState("");
  const [error, setError] = useState("");

  const parseIngredients = (): IngredientInput[] => {
    return ingredientsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => ({
        customName: line,
        amount: 1,
        unit: "шт",
      }));
  };

  const submit = async () => {
    setError("");

    if (!title || !instructions) {
      setError("Заполните название и инструкцию");
      return;
    }

    const ingredients = parseIngredients();

    if (ingredients.length === 0) {
      setError("Добавьте хотя бы один ингредиент");
      return;
    }

    try {
      await recipesApi.create({
        title,
        description,
        instructions,
        prepTime,
        servings,
        ingredients,
      });

      navigate("/");
    } catch {
      setError("Не удалось создать рецепт");
    }
  };

  return (
    <Page>
      <h1>Создать рецепт</h1>

      <div className="card recipe-form">
        {/* BASIC INFO */}
        <div className="form-section">
          <label>Название рецепта</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Омлет с сыром"
          />

          <label>Краткое описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Несколько слов о блюде"
          />
        </div>

        {/* INSTRUCTIONS */}
        <div className="form-section">
          <label>Инструкция приготовления</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Опишите процесс приготовления по шагам"
          />
        </div>

        {/* INGREDIENTS */}
        <div className="form-section">
          <label>Ингредиенты (каждый с новой строки)</label>
          <textarea
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder={`Например:\nЯйца\nМолоко\nСыр`}
          />
        </div>

        {/* META */}
        <div className="form-section form-row">
          <div>
            <label>Время приготовления (мин)</label>
            <input
              type="number"
              min={1}
              value={prepTime}
              onChange={(e) => setPrepTime(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Количество порций</label>
            <input
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
            />
          </div>
        </div>

        {/* ACTION */}
        <div className="form-actions">
          <button onClick={submit}>Создать рецепт</button>
        </div>

        {error && <div className="error">{error}</div>}
      </div>
    </Page>
  );
}
