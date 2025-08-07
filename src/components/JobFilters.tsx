import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WORK_CATEGORIES, COMUNAS_SANTIAGO } from '@/data/chileanData';
import { Filter, X } from 'lucide-react';

interface JobFiltersProps {
  onFilterChange: (filters: JobFilters) => void;
  totalJobs: number;
}

export interface JobFilters {
  category: string;
  comuna: string;
  minPrice: string;
  maxPrice: string;
}

const JobFilters = ({ onFilterChange, totalJobs }: JobFiltersProps) => {
  const [filters, setFilters] = useState<JobFilters>({
    category: '',
    comuna: '',
    minPrice: '',
    maxPrice: ''
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof JobFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = { category: '', comuna: '', minPrice: '', maxPrice: '' };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filtrar trabajos</span>
            <span className="text-sm text-muted-foreground">({totalJobs} encontrados)</span>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Ocultar' : 'Mostrar'} filtros
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="category-filter">Categoría</Label>
              <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las categorías</SelectItem>
                  {WORK_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="comuna-filter">Comuna</Label>
              <Select value={filters.comuna} onValueChange={(value) => updateFilter('comuna', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las comunas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las comunas</SelectItem>
                  {COMUNAS_SANTIAGO.map((comuna) => (
                    <SelectItem key={comuna} value={comuna}>{comuna}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="min-price">Precio mínimo (CLP)</Label>
              <Input
                id="min-price"
                type="number"
                placeholder="0"
                value={filters.minPrice}
                onChange={(e) => updateFilter('minPrice', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="max-price">Precio máximo (CLP)</Label>
              <Input
                id="max-price"
                type="number"
                placeholder="Sin límite"
                value={filters.maxPrice}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobFilters;