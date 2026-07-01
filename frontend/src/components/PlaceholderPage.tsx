interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <article className="placeholder-page">
      <h2>{title}</h2>
      <p>Pending user-story implementation.</p>
    </article>
  );
}
