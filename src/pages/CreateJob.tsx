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
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CATEGORIES = {
  agricultura: 'Agricultura y Pesca 🌾',
  comercio: 'Comercio y Ventas 🛒',
  oficios: 'Oficios y Construcción 🔧',
  domesticos: 'Servicios Domésticos 🏠',
  transporte: 'Transporte y Delivery 🚚'
};

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
    duration_hours: ''
  });

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
        duration_hours: jobData.duration_hours ? parseInt(jobData.duration_hours) : null
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
                  onValueChange={(value) => setJobData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_amount">Pago (CLP)</Label>
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
                  <Label htmlFor="payment_type">Tipo de Pago</Label>
                  <Select 
                    value={jobData.payment_type} 
                    onValueChange={(value) => setJobData(prev => ({ ...prev, payment_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="por_hora">Por Hora</SelectItem>
                      <SelectItem value="por_dia">Por Día</SelectItem>
                      <SelectItem value="por_trabajo">Por Trabajo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={jobData.location}
                  onChange={(e) => setJobData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Comuna, Región"
                  required
                />
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
                  <Label htmlFor="duration_hours">Duración (horas)</Label>
                  <Input
                    id="duration_hours"
                    type="number"
                    value={jobData.duration_hours}
                    onChange={(e) => setJobData(prev => ({ ...prev, duration_hours: e.target.value }))}
                    placeholder="8"
                  />
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