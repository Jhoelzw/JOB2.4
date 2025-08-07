import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Clock, DollarSign, Plus, MessageCircle, TrendingUp, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WORK_CATEGORIES, formatCLP } from '@/data/chileanData';
import PricingGuide from '@/components/PricingGuide';
import JobDetailsModal from '@/components/JobDetailsModal';
import JobFilters, { JobFilters as JobFiltersType } from '@/components/JobFilters';
import { toast } from '@/hooks/use-toast';

// Convert WORK_CATEGORIES to the format expected by Dashboard
const CATEGORIES = WORK_CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = { name: cat.name, icon: cat.emoji };
  return acc;
}, {} as Record<string, { name: string; icon: string }>);

interface Job {
  id: string;
  title: string;
  description: string;
  category: keyof typeof CATEGORIES;
  payment_amount: number;
  payment_type: string;
  location: string;
  date_needed: string;
  duration_hours?: number;
  status: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPricingGuide, setShowPricingGuide] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        profiles:employer_id (
          first_name,
          last_name
        )
      `)
      .eq('status', 'activo')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data as any);
      setFilteredJobs(data as any);
    }
    setLoading(false);
  };

  const formatPayment = (amount: number, type: string) => {
    const formatted = formatCLP(amount);
    
    const typeMap = {
      por_hora: 'por hora',
      por_dia: 'por día',
      por_trabajo: 'por trabajo'
    };
    
    return `${formatted} ${typeMap[type as keyof typeof typeMap] || type}`;
  };

  const handleApplyJob = async (jobId: string) => {
    if (!profile) return;

    // Check if already applied
    const { data: existingApplication } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('worker_id', profile.id)
      .single();

    if (existingApplication) {
      toast({
        title: "Ya aplicaste",
        description: "Ya has aplicado a este trabajo",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('applications')
      .insert({
        job_id: jobId,
        worker_id: profile.id,
        message: 'Estoy interesado en este trabajo'
      });

    if (!error) {
      toast({
        title: "¡Aplicación enviada!",
        description: "Tu aplicación se ha enviado correctamente"
      });
      setShowJobModal(false);
      fetchJobs(); // Refresh jobs
    } else {
      toast({
        title: "Error",
        description: "No se pudo enviar la aplicación",
        variant: "destructive"
      });
    }
  };

  const applyFilters = (filters: JobFiltersType) => {
    let filtered = [...jobs];

    if (filters.category) {
      filtered = filtered.filter(job => job.category === filters.category);
    }

    if (filters.comuna) {
      filtered = filtered.filter(job => job.location === filters.comuna);
    }

    if (filters.minPrice) {
      filtered = filtered.filter(job => job.payment_amount >= parseInt(filters.minPrice));
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(job => job.payment_amount <= parseInt(filters.maxPrice));
    }

    setFilteredJobs(filtered);
  };

  const openJobDetails = (job: Job) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  const JobCard = ({ job }: { job: Job }) => {
    const category = CATEGORIES[job.category];
    const getDurationText = (hours?: number) => {
      if (!hours) return 'Varios días';
      if (hours <= 2) return '1-2h';
      if (hours <= 4) return 'Medio día';
      if (hours <= 8) return 'Día completo';
      return `${hours}h`;
    };

    return (
      <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg leading-tight line-clamp-2">{job.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <span className="text-lg">{category.icon}</span>
                <span className="text-sm">{category.name}</span>
              </CardDescription>
            </div>
            <Badge variant="default" className="text-sm font-bold whitespace-nowrap">
              {formatPayment(job.payment_amount, job.payment_type)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" />
              <span className="truncate">{job.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              <span>{new Date(job.date_needed).toLocaleDateString('es-CL')}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-primary" />
              <span>{getDurationText(job.duration_hours)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-xs">
                  {job.profiles.first_name[0]}{job.profiles.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs truncate">{job.profiles.first_name}</span>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                openJobDetails(job);
              }}
              className="flex-1"
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver detalles
            </Button>
            {profile?.user_type === 'trabajador' && (
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyJob(job.id);
                }}
                className="flex-1"
              >
                Aplicar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-primary">WorkMatch Chile</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.user_type === 'trabajador' ? 'Encuentra trabajos' : 'Gestiona empleos'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {profile?.user_type === 'empleador' && (
              <Button onClick={() => navigate('/crear-trabajo')}>
                <Plus className="h-4 w-4 mr-2" />
                Publicar Trabajo
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/perfil')}>
              Perfil
            </Button>
            <Button variant="ghost" onClick={() => signOut()}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Pricing Guide for Workers */}
        {profile?.user_type === 'trabajador' && (
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">Guía de Precios 2025</h3>
                      <p className="text-sm text-blue-700">Consulta tarifas referenciales del mercado</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPricingGuide(!showPricingGuide)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    {showPricingGuide ? 'Ocultar' : 'Ver Precios'}
                  </Button>
                </div>
                {showPricingGuide && (
                  <div className="mt-4">
                    <PricingGuide />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">
            {profile?.user_type === 'trabajador' ? 'Trabajos Disponibles' : 'Trabajos Activos'}
          </h2>
        </div>

        {/* Filters */}
        <JobFilters onFilterChange={applyFilters} totalJobs={filteredJobs.length} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>

        {filteredJobs.length === 0 && jobs.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay trabajos que coincidan con los filtros</p>
          </div>
        )}

        {jobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay trabajos disponibles</p>
            {profile?.user_type === 'empleador' && (
              <Button onClick={() => navigate('/crear-trabajo')}>
                Publicar el primer trabajo
              </Button>
            )}
          </div>
        )}

        {/* Job Details Modal */}
        <JobDetailsModal
          job={selectedJob}
          isOpen={showJobModal}
          onClose={() => setShowJobModal(false)}
          onApply={handleApplyJob}
          onMessage={() => navigate('/chat')}
          canApply={profile?.user_type === 'trabajador'}
        />
      </main>
    </div>
  );
};

export default Dashboard;