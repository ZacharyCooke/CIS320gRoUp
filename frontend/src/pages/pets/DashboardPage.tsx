const samplePets = [
  { id: "1", name: "Bella", species: "Dog", status: "Safe" },
  { id: "2", name: "Milo", species: "Cat", status: "Lost" }
];

export function DashboardPage() {
  return (
    <section>
      <h1>My Pets</h1>
      <div className="page-grid">
        {samplePets.map((pet) => (
          <article className="placeholder-page" key={pet.id}>
            <h2>{pet.name}</h2>
            <p>{pet.species}</p>
            <strong>{pet.status}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
