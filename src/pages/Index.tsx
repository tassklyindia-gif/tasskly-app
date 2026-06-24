import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, TrendingUp, Shield } from "lucide-react";
import { categories } from "@/data/mockData";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import MagicBento from "@/components/MagicBento";

const Index = () => {
  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />

      {/* Hero Section - Sticky */}
      <section className="sticky top-0 h-[85vh] overflow-hidden z-0">
        {/* Animated background */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-primary/10 blur-[80px]"
              style={{
                width: 150 + i * 100,
                height: 150 + i * 100,
                left: `${(i * 25) % 100}%`,
                top: `${(i * 30) % 100}%`,
              }}
              animate={{
                x: [0, Math.sin(i) * 50, 0],
                y: [0, Math.cos(i) * 50, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}

        <div className="container relative mx-auto px-4 text-center z-10 h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="category" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              The Student Freelance Platform
            </Badge>
 
            <motion.h1 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-4xl font-display text-5xl font-black leading-tight text-foreground md:text-7xl md:leading-[1.1] tracking-tighter"
            >
              Crafting Digital{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Careers & Skills.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground font-medium"
            >
              Tasskly is the immersive freelance marketplace built for students. Building truly memorable experiences within your campus community.
            </motion.p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              <Link to="/jobs">
                <Button variant="hero" size="lg" className="h-14 px-10 text-lg rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                  Explore Work
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/post-job">
                <Button variant="hero-outline" size="lg" className="h-14 px-10 text-lg rounded-full transition-all">
                  Start New Project
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories - Scrolls over Hero */}
      <section className="relative z-10 border-t py-16 overflow-hidden bg-white">


        <div className="container relative z-10 mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-black text-gray-800 md:text-5xl tracking-tight">
              Services We Offer
            </h2>
            <p className="mt-4 text-lg text-gray-600">We blend strategic thinking with bold creativity across categories.</p>
          </div>

          <MagicBento />
        </div>
      </section>


      {/* FAQ Section (Pulsewave style) */}
      <section className="relative z-10 bg-white py-24 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="font-display text-4xl font-black text-foreground md:text-5xl tracking-tight mb-6">
                Frequently Asked<br/>Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                We blend strategic thinking with bold creativity. Tasskly is more than a marketplace—it's a partner in your career journey.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { q: "How fast can I start?", a: "Instantly. Sign up with your student email and you can post or find work in minutes. Our onboarding is streamlined for maximum speed." },
                { q: "Is it secure?", a: "Absolutely. We use a secure enterprise-grade escrow system for all payments, ensuring money only moves when work is verified and complete." },
                { q: "What projects can I post?", a: "Anything from simple assignments and design tasks to complex coding projects and long-term mentoring. If it can be done by a student, it belongs on Tasskly." }
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group rounded-2xl border bg-gray-50 p-6 transition-all hover:border-primary/50 cursor-pointer"
                >
                  <h4 className="font-display text-xl font-bold text-foreground flex justify-between items-center group-hover:text-primary transition-colors">
                    {item.q}
                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all -rotate-45" />
                  </h4>
                  <p className="mt-3 text-muted-foreground hidden group-hover:block animate-in slide-in-from-top-2 duration-300">{item.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 bg-background py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="font-display text-4xl font-black text-foreground md:text-5xl tracking-tight">
              Our Process
            </h2>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                icon: <Sparkles className="h-8 w-8" />,
                title: "Discovery",
                desc: "Post a micro job or browse tasks that match your unique skills and vision.",
              },
              {
                icon: <TrendingUp className="h-8 w-8" />,
                title: "Execution",
                desc: "Accept jobs instantly and secure payment via our enterprise-grade escrow system.",
              },
              {
                icon: <Shield className="h-8 w-8" />,
                title: "Delivery",
                desc: "Complete the work, get rated, and receive payment securely in your dashboard.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className="group"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
                <h3 className="mb-3 font-display text-2xl font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer (Pulsewave style) */}
      <footer className="relative z-10 border-t bg-background py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16 text-left">
            <div className="col-span-2">
              <span className="font-display text-3xl font-black text-foreground block mb-4">Tasskly</span>
              <p className="text-muted-foreground max-w-xs mb-6">
                The immersive freelance marketplace built for students, by students. Worldwide campus reach.
              </p>
              <div className="flex gap-4">
                 {/* Social links placeholder */}
                 <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer">T</div>
                 <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer">I</div>
                 <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer">L</div>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-primary">Navigation</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-primary transition-colors cursor-pointer">Home</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Work</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Services</li>
                <li className="hover:text-primary transition-colors cursor-pointer">About</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-primary">Services</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-primary transition-colors cursor-pointer">Design</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Development</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Branding</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Tutoring</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-primary">Contact</h4>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=support@tasskly.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground mb-2 block hover:text-primary transition-colors">
                support@tasskly.com
              </a>
              <p className="text-sm text-muted-foreground font-bold underline cursor-pointer">Start New Project</p>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground uppercase tracking-widest">
            <p>© 2026 Tasskly Studio - All rights reserved</p>
            <p>Created with passion for students</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
