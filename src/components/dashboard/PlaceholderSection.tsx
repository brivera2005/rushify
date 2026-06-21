import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

type PlaceholderSectionProps = {
  title: string;
  description: string;
  items?: string[];
};

export function PlaceholderSection({
  title,
  description,
  items = ["Coming soon", "Coming soon", "Coming soon", "Coming soon"],
}: PlaceholderSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <Card key={`${title}-${index}`} className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-surface-elevated to-background" />
            <CardHeader>
              <CardTitle>{item}</CardTitle>
              <CardDescription>Placeholder content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 w-2/3 rounded-full bg-border" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
