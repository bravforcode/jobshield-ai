import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WageRadarCard } from "@/components/wage-radar-card";
import { getArtifacts } from "@/lib/data.server";
import { formatThb } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function WageRadarPage() {
  const { wageRadar } = getArtifacts();
  const underpaid = wageRadar.filter((r) => r.underpaid);
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Wage radar
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Degree centrality × median wage.
        </h1>
        <p className="max-w-2xl text-balance text-muted-foreground">
          The dashed line is an OLS fit of median wage on degree centrality — what the network
          predicts each occupation should pay. Points below the line are flagged as underpaid.
        </p>
      </div>

      <div className="mb-6">
        <WageRadarCard data={wageRadar} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Underpaid signals</CardTitle>
            <CardDescription>
              {underpaid.length} of {wageRadar.length} occupations sit more than 5% below the model.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {underpaid.map((r) => (
                <li
                  key={r.occ}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{r.label}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{r.occ}</span>
                  </div>
                  <Badge variant="signal" className="font-mono text-[10px]">
                    −{(r.gap_ratio * 100).toFixed(1)}%
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All occupations</CardTitle>
            <CardDescription>
              Sorted by degree centrality descending. Predicted wage is the OLS fit at the
              occupation&apos;s centrality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occupation</TableHead>
                  <TableHead className="text-right">Centrality</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Predicted</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wageRadar.map((r) => (
                  <TableRow key={r.occ}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{r.label}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{r.occ}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.centrality.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatThb(r.wage)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatThb(r.predicted)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={r.underpaid ? "signal" : "secondary"}
                        className="font-mono text-[10px]"
                      >
                        {r.gap_ratio > 0 ? "+" : ""}
                        {(r.gap_ratio * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
