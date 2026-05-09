import React from 'react';
import { SeoSection, SeoSectionHeading } from '@/components/seo/SeoPageLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export function ComparisonTableSection({
  title,
  description,
  columns = [],
  rows = [],
  tone = 'muted',
  highlightColumn,
}) {
  if (!Array.isArray(columns) || columns.length < 2 || !Array.isArray(rows) || !rows.length) {
    return null;
  }

  return (
    <SeoSection tone={tone}>
      <SeoSectionHeading title={title} description={description} />

      <div className="mt-12 overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-[0_26px_70px_-46px_rgba(0,0,0,0.45)]">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[26%] min-w-[160px] text-foreground">Criteria</TableHead>
              {columns.map((column, index) => (
                <TableHead
                  key={column}
                  className={cn(
                    'min-w-[180px]',
                    highlightColumn === index ? 'font-bold text-primary' : 'text-foreground',
                  )}
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={`${row.feature}-${rowIndex}`}>
                <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                {row.values.map((value, valueIndex) => (
                  <TableCell
                    key={`${row.feature}-${valueIndex}`}
                    className={cn(
                      'align-top text-muted-foreground',
                      highlightColumn === valueIndex ? 'font-medium text-foreground' : null,
                    )}
                  >
                    {value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SeoSection>
  );
}
