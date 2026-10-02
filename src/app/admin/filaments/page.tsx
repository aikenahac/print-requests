import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { FilamentForm } from "@/components/forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/access";
import { listFilaments } from "@/lib/queries";

export default async function FilamentsPage() {
  const actor = await requireAdmin();
  const filaments = await listFilaments();

  return (
    <AppShell username={actor.username} admin>
      <div className="space-y-7">
        <div>
          <p className="text-xs font-semibold tracking-[.2em] text-primary uppercase">
            Materials library
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Filaments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Give friends a clear picture of the colors they can choose.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Add filament</CardTitle>
          </CardHeader>
          <CardContent>
            <FilamentForm />
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          {filaments.map((filament) => (
            <Card key={filament.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{filament.name}</CardTitle>
                  <Badge variant={filament.available ? "default" : "secondary"}>
                    {filament.available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {filament.imagePath && (
                  <Image
                    src={`/api/filament-images/${filament.imagePath}`}
                    alt={`Example of ${filament.name}`}
                    width={600}
                    height={360}
                    unoptimized
                    className="h-44 w-full border object-cover"
                  />
                )}
                <FilamentForm initial={filament} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
