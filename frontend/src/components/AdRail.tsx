import { SidebarAd } from "./SidebarAd";

interface Props {
  isPremium: boolean;
}

// Fixed to the outer viewport margins rather than placed inline in the
// content column — ads only ever appear on the sides of the page, never
// interrupting the main content. .ad-rail hides itself below a width
// threshold where there's no real margin left to sit in, so narrow/tablet
// viewports simply show no ads rather than falling back into the flow.
export function AdRail({ isPremium }: Props) {
  if (isPremium) return null;

  return (
    <>
      <div className="ad-rail ad-rail-left">
        <SidebarAd isPremium={isPremium} adIndex={0} />
      </div>
      <div className="ad-rail ad-rail-right">
        <SidebarAd isPremium={isPremium} adIndex={1} />
      </div>
    </>
  );
}
