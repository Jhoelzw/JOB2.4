import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WORK_CATEGORIES, formatCLP } from '@/data/chileanData';
import { Info } from 'lucide-react';

const PricingGuide = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-center">
          📊 Guía de Precios 2025
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
          <Info className="h-4 w-4 text-blue-600" />
          <span>
            Precios referenciales basados en mercado 2025. Tienes total libertad para acordar el precio final.
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {WORK_CATEGORIES.map((category) => (
          <div key={category.id} className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Por hora:</span>
                <div className="font-medium text-primary">
                  {formatCLP(category.hourlyRange.min)} - {formatCLP(category.hourlyRange.max)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Por día:</span>
                <div className="font-medium text-primary">
                  {formatCLP(category.dailyRange.min)} - {formatCLP(category.dailyRange.max)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PricingGuide;