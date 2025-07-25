import { Leaf, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-primary-foreground/10 rounded-lg">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold">AgriConnect</span>
            </div>
            <p className="text-primary-foreground/80">
              Connecting farmers to markets through innovative technology and sustainable practices.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Quick Links</h3>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Marketplace</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Vendor Registration</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Support</a></li>
            </ul>
          </div>

          {/* For Vendors */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">For Vendors</h3>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Vendor Dashboard</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Resources</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Success Stories</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Contact Us</h3>
            <div className="space-y-3 text-primary-foreground/80">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>support@agriconnect.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>+232 123-4567</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Agriculture Hub, Farm District</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/60">
          <p>&copy; 2025 AgriConnect. All rights reserved. Empowering farmers, feeding communities.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;