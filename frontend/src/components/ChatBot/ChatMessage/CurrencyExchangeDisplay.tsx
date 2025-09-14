import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CurrencyRate {
  currency: string;
  buy: number;
  sell: number;
  date: string;
}

interface CurrencyExchangeDisplayProps {
  data: {
    type: 'currency_chart';
    content: {
      type: string;
      image: string;
      data: {
        rates: CurrencyRate[];
        date: string;
        source: string;
      };
    };
    timestamp: string;
  };
}

export const CurrencyExchangeDisplay: React.FC<CurrencyExchangeDisplayProps> = ({ data }) => {
  const { content } = data;
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Currency Exchange Rates - {content.data.date}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <img 
              src={`data:image/png;base64,${content.image}`}
              alt="Currency Exchange Rates Chart"
              className="w-full h-auto"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Buy Rate</TableHead>
                <TableHead className="text-right">Sell Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.data.rates.map((rate) => (
                <TableRow key={rate.currency}>
                  <TableCell>{rate.currency}</TableCell>
                  <TableCell className="text-right">{rate.buy.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{rate.sell.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 text-sm text-muted-foreground">
            Data source: {content.data.source}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};