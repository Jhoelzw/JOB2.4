import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Phone, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { WORK_CATEGORIES, COMUNAS_SANTIAGO, formatCLP, validateRUT } from '@/data/chileanData';
import PricingGuide from '@/components/PricingGuide';

const Profile = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    location: '',
    bio: '',
    categories: [] as string[],
    hourly_rate: '',
    comuna: '',
    whatsapp: '',
    experience: '',
    employer_type: '',
    rut: ''
  });
  
  const [showPricingGuide, setShowPricingGuide] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        location: profile.location || '',
        bio: profile.bio || '',
        categories: profile.categories || [],
        hourly_rate: profile.hourly_rate ? profile.hourly_rate.toString() : '',
        comuna: profile.comuna || '',
        whatsapp: profile.whatsapp || '',
        experience: profile.experience || '',
        employer_type: profile.employer_type || '',
        rut: profile.rut || ''
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // Validate RUT for employers
    if (profile.user_type === 'empleador' && profileData.rut && !validateRUT(profileData.rut)) {
      toast({
        title: "Error",
        description: "Formato de RUT inválido. Use XX.XXX.XXX-X",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    const updateData = {
      ...profileData,
      hourly_rate: profileData.hourly_rate ? parseInt(profileData.hourly_rate) : null
    };
    
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil",
        variant: "destructive"
      });
    } else {
      toast({
        title: "¡Perfil actualizado!",
        description: "Tu información se ha guardado correctamente"
      });
    }
    
    setLoading(false);
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setProfileData(prev => ({
      ...prev,
      categories: checked 
        ? [...prev.categories, categoryId]
        : prev.categories.filter(id => id !== categoryId)
    }));
  };

  if (!profile) return null;

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
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {profile.first_name[0]}{profile.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">Mi Perfil</CardTitle>
                <p className="text-muted-foreground capitalize">
                  {profile.user_type}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input
                    id="first_name"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Comuna */}
              <div>
                <Label htmlFor="comuna">Comuna</Label>
                <Select value={profileData.comuna} onValueChange={(value) => setProfileData(prev => ({ ...prev, comuna: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu comuna" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMUNAS_SANTIAGO.map((comuna) => (
                      <SelectItem key={comuna} value={comuna}>
                        {comuna}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">
                    <Phone className="inline h-4 w-4 mr-1" />
                    WhatsApp
                  </Label>
                  <Input
                    id="whatsapp"
                    value={profileData.whatsapp}
                    onChange={(e) => setProfileData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              {/* Worker-specific fields */}
              {profile.user_type === 'trabajador' && (
                <>
                  {/* Categories */}
                  <div>
                    <Label className="text-base font-semibold">Categorías de Trabajo</Label>
                    <div className="mt-3 space-y-3">
                      {WORK_CATEGORIES.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={category.id}
                            checked={profileData.categories.includes(category.id)}
                            onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                          />
                          <Label htmlFor={category.id} className="text-sm font-normal">
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Guide Button */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPricingGuide(!showPricingGuide)}
                      className="mb-3"
                    >
                      {showPricingGuide ? 'Ocultar' : 'Ver'} Guía de Precios 2025
                    </Button>
                    {showPricingGuide && <PricingGuide />}
                  </div>

                  {/* Personal Rate */}
                  <div>
                    <Label htmlFor="hourly_rate">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Mi tarifa por hora (CLP)
                    </Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      value={profileData.hourly_rate}
                      onChange={(e) => setProfileData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                      placeholder="Ej: 4500"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Precios referenciales basados en mercado 2025. Tienes total libertad para acordar el precio final.
                    </p>
                  </div>

                  {/* Experience */}
                  <div>
                    <Label htmlFor="experience">Experiencia y Habilidades</Label>
                    <Textarea
                      id="experience"
                      value={profileData.experience}
                      onChange={(e) => setProfileData(prev => ({ ...prev, experience: e.target.value }))}
                      placeholder="Describe tu experiencia laboral, habilidades específicas, años de experiencia, herramientas que manejas..."
                      rows={4}
                    />
                  </div>
                </>
              )}

              {/* Employer-specific fields */}
              {profile.user_type === 'empleador' && (
                <>
                  {/* Employer Type */}
                  <div>
                    <Label htmlFor="employer_type">Tipo de Empleador</Label>
                    <Select value={profileData.employer_type} onValueChange={(value) => setProfileData(prev => ({ ...prev, employer_type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="empresa">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* RUT */}
                  <div>
                    <Label htmlFor="rut">RUT</Label>
                    <Input
                      id="rut"
                      value={profileData.rut}
                      onChange={(e) => setProfileData(prev => ({ ...prev, rut: e.target.value }))}
                      placeholder="12.345.678-9"
                    />
                  </div>

                  {/* Company Description */}
                  <div>
                    <Label htmlFor="bio">Descripción</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Describe tu empresa, sector, tipo de trabajos que ofreces habitualmente..."
                      rows={4}
                    />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;