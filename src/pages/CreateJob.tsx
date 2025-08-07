import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { WORK_CATEGORIES, COMUNAS_SANTIAGO, formatCLP } from '@/data/chileanData';

const CreateJob = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState({
    title: '',
    description: '',
    category: '',
    payment_amount: '',
    payment_type: 'por_dia',
    location: '',
    date_needed: '',
    duration: ''
  });

  const [selectedCategory, setSelectedCategory] = useState('');

  const getSelectedCategoryData = () => {
    return WORK_CATEGORIES.find(cat => cat.id === selectedCategory);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    
    const { error } = await supabase
      .from('jobs')
      .insert({
        employer_id: profile.id,
        title: jobData.title,
        description: jobData.description,
        category: jobData.category,
        payment_amount: parseInt(jobData.payment_amount),
        payment_type: jobData.payment_type,
        location: jobData.location,
        date_needed: jobData.date_needed,
        duration_hours: jobData.duration === 'varios_dias' ? null : 
                      jobData.duration === 'dia_completo' ? 8 :
                      jobData.duration === 'medio_dia' ? 4 :
                      jobData.duration === '1-2h' ? 2 : null
      });
    
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el trabajo",
        variant: "destructive"
      });
    } else {
      toast({
        title: "¡Trabajo publicado!",
        description: "Tu trabajo se ha publicado exitosamente"
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Publicar Nuevo Trabajo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Título del Trabajo</Label>
                <Input
                  id="title"
                  value={jobData.title}
                  onChange={(e) => setJobData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="ej. Ayudante de construcción"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select 
                  value={jobData.category} 
                  onValueChange={(value) => {
                    setJobData(prev => ({ ...prev, category: value }));
                    setSelectedCategory(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={jobData.description}
                  onChange={(e) => setJobData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe las tareas y requisitos del trabajo..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="payment_amount">Presupuesto (CLP)</Label>
                  {selectedCategory && getSelectedCategoryData() && (
                    <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Rangos referenciales {getSelectedCategoryData()?.emoji}</span>
                      </div>
                      <div className="text-sm text-blue-700">
                        <p>Por hora: {formatCLP(getSelectedCategoryData()!.hourlyRange.min)} - {formatCLP(getSelectedCategoryData()!.hourlyRange.max)}</p>
                        <p>Por día: {formatCLP(getSelectedCategoryData()!.dailyRange.min)} - {formatCLP(getSelectedCategoryData()!.dailyRange.max)}</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        id="payment_amount"
                        type="number"
                        value={jobData.payment_amount}
                        onChange={(e) => setJobData(prev => ({ ...prev, payment_amount: e.target.value }))}
                        placeholder="25000"
                        required
                      />
                    </div>
                    <div>
                      <Select 
                        value={jobData.payment_type} 
                        onValueChange={(value) => setJobData(prev => ({ ...prev, payment_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo de pago" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="por_hora">Por Hora</SelectItem>
                          <SelectItem value="por_dia">Por Día</SelectItem>
                          <SelectItem value="por_trabajo">Por Trabajo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="location">Comuna</Label>
                <Select 
                  value={jobData.location} 
                  onValueChange={(value) => setJobData(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona comuna" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMUNAS_SANTIAGO.map((comuna) => (
                      <SelectItem key={comuna} value={comuna}>{comuna}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_needed">Fecha Necesaria</Label>
                  <Input
                    id="date_needed"
                    type="date"
                    value={jobData.date_needed}
                    onChange={(e) => setJobData(prev => ({ ...prev, date_needed: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duración Estimada</Label>
                  <Select 
                    value={jobData.duration} 
                    onValueChange={(value) => setJobData(prev => ({ ...prev, duration: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona duración" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-2h">1-2 horas</SelectItem>
                      <SelectItem value="medio_dia">Medio día (4h)</SelectItem>
                      <SelectItem value="dia_completo">Día completo (8h)</SelectItem>
                      <SelectItem value="varios_dias">Varios días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Publicando...' : 'Publicar Trabajo'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateJob;