import { Card, CardContent } from "@/components/ui/card";
import { 
  Store, 
  ShoppingBag, 
  CreditCard, 
  Truck, 
  Bell, 
  Shield,
  BarChart3,
  MapPin 
} from "lucide-react";

const features = [
  {
    icon: Store,
    title: "Vendor Portal",
    description: "Complete dashboard for farmers to manage products, orders, and analytics",
    color: "text-primary",
    bg: "bg-primary/10"
  },
  {
    icon: ShoppingBag,
    title: "Smart Marketplace",
    description: "Browse fresh produce by category, location, and seasonal availability",
    color: "text-accent-foreground",
    bg: "bg-accent/10"
  },
  {
    icon: CreditCard,
    title: "Mobile Money",
    description: "Secure payments via Orange Money, AfriMoney, and digital wallets",
    color: "text-primary",
    bg: "bg-primary/10"
  },
  {
    icon: Truck,
    title: "Delivery Network",
    description: "Local logistics partners ensure fresh produce reaches you quickly",
    color: "text-accent-foreground",
    bg: "bg-accent/10"
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "SMS and push alerts for order updates, harvest seasons, and promotions",
    color: "text-primary",
    bg: "bg-primary/10"
  },
  {
    icon: Shield,
    title: "Secure & Verified",
    description: "KYC verification for vendors and encrypted data protection",
    color: "text-accent-foreground",
    bg: "bg-accent/10"
  },
  {
    icon: BarChart3,
    title: "Sales Analytics",
    description: "Track performance, seasonal trends, and optimize your farm business",
    color: "text-primary",
    bg: "bg-primary/10"
  },
  {
    icon: MapPin,
    title: "Local Focus",
    description: "Support your local farming community with location-based shopping",
    color: "text-accent-foreground",
    bg: "bg-accent/10"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-gradient-earth">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Everything You Need for Agricultural Commerce
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our platform bridges the gap between farmers and consumers with modern technology, 
            secure payments, and reliable delivery networks.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-agricultural transition-all duration-300 hover:-translate-y-1 border-border bg-card">
              <CardContent className="p-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${feature.bg} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;