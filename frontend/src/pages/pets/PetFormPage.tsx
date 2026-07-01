import { useState } from "react";

export function PetFormPage() {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [color, setColor] = useState("");

  return (
    <section className="form-page">
      <h1>Add pet profile</h1>
      <form>
        <label>
          Pet name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Species
          <select value={species} onChange={(event) => setSpecies(event.target.value)}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="bird">Bird</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Color
          <input value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <label>
          Photo
          <input type="file" accept="image/png,image/jpeg" />
        </label>
        <button type="submit">Save pet</button>
      </form>
    </section>
  );
}
