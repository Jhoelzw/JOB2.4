import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Briefcase, MapPin, Star } from "lucide-react";
import heroImage from "@/assets/hero-chile.jpg";

export const LandingHero = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-glow via-background to-accent">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-success rounded-lg flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-primary">WorkMatch Chile</h1>
          </div>
          <Button variant="outline" size="sm">
            Iniciar Sesión
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="px-4 py-12">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Conecta con <span className="text-primary">trabajo</span> en
                <span className="text-success"> Chile</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                La plataforma que une trabajadores informales con empleadores de forma fácil, 
                segura y confiable. Encuentra tu próxima pega o el trabajador perfecto.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="text-lg">
                <Users className="h-5 w-5" />
                Soy Trabajador
              </Button>
              <Button variant="outline" size="lg" className="text-lg">
                <Briefcase className="h-5 w-5" />
                Soy Empleador
              </Button>
            </div>

            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>Todo Chile</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>+1000 trabajos</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>+500 usuarios</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <img
              src={heroImage}
              alt="Trabajadores chilenos"
              className="rounded-2xl shadow-elegant w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl"></div>
          </div>
        </div>
      </div>

      {/* Categories Preview */}
      <div className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-center text-foreground mb-8">
            Categorías de Trabajo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: "🌾", name: "Agricultura y Pesca", count: "120+" },
              { icon: "🛒", name: "Comercio y Ventas", count: "200+" },
              { icon: "🔧", name: "Oficios y Construcción", count: "300+" },
              { icon: "🏠", name: "Servicios Domésticos", count: "150+" },
              { icon: "🚚", name: "Transporte y Delivery", count: "180+" },
            ].map((category, index) => (
              <Card key={index} className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-3xl mb-2">{category.icon}</div>
                <h4 className="font-medium text-sm text-foreground mb-1">{category.name}</h4>
                <p className="text-xs text-success font-medium">{category.count} ofertas</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-4 py-12 bg-card">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-foreground mb-8">
            Confiado por miles de chilenos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary">1.2K+</div>
              <div className="text-muted-foreground">Trabajadores registrados</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-success">500+</div>
              <div className="text-muted-foreground">Empleadores activos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">2.5K+</div>
              <div className="text-muted-foreground">Trabajos completados</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-success">4.8★</div>
              <div className="text-muted-foreground">Calificación promedio</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};