import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, TrendingUp, Users, Globe } from "lucide-react";
import farmImage from "@/assets/farm-landscape.jpg";

const benefits = [
  "Reach customers directly without middlemen",
  "Set your own prices and manage inventory",
  "Real-time sales analytics and insights",
  "Mobile money integration for easy payments",
  "Delivery coordination with local partners",
  "KYC verification builds customer trust"
];

const VendorSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-foreground">
                Grow Your Farm Business
                <span className="text-primary"> Online</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Join hundreds of local farmers who have transformed their business with our digital platform. 
                Sell directly to customers, manage orders efficiently, and grow your agricultural enterprise.
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-primary">+150%</div>
                  <div className="text-xs text-muted-foreground">Avg Income Growth</div>
                </CardContent>
              </Card>
              <Card className="bg-accent/10 border-accent/30">
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-accent-foreground mx-auto mb-2" />
                  <div className="text-2xl font-bold text-accent-foreground">5000+</div>
                  <div className="text-xs text-muted-foreground">Active Customers</div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-primary">24/7</div>
                  <div className="text-xs text-muted-foreground">Market Access</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="agricultural" size="lg">
                Register as Vendor
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-agricultural">
              <img 
                src={farmImage}
                alt="Farmer working in agricultural field"
                className="w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
            
            {/* Floating Card */}
            <Card className="absolute -bottom-6 -right-6 bg-card border-border shadow-harvest">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">98%</div>
                  <div className="text-sm text-muted-foreground">Vendor Satisfaction</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorSection;