import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Headphones, HelpCircle, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const faqs = [
  {
    q: "How do I release payment to a worker?",
    a: "Go to the 'Submitted Work' tab in your dashboard, click on the active job, and select 'Accept & Release Payment'. You will also be prompted to rate the worker's performance."
  },
  {
    q: "What is escrow protection?",
    a: "When you accept a worker's bid, your payment is securely held in escrow. The funds are only released to the worker once they upload the completed deliverables and you review and approve them."
  },
  {
    q: "How can I update my payment or UPI details?",
    a: "Navigate to the 'Your Information' tab in your dashboard. There you can edit your UPI ID (format: name@bank) and save it to receive automatic payouts for jobs you complete."
  },
  {
    q: "What happens if a worker submits incorrect or incomplete work?",
    a: "If the deliverables do not meet your expectations, you can reject the submission. The worker will be notified and can upload revisions. If a dispute arises that you cannot resolve, contact support@tasskly.com for review."
  }
];

const CustomerService = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Headphones className="h-6 w-6 text-primary" />
          Customer Service
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Have questions or need assistance? Our support team is here to help you.
        </p>
      </div>

      {/* Support Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="h-full border border-primary/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-5 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <Mail className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Email Support</CardTitle>
              <CardDescription>Get in touch with us via email. We typically reply within 2-4 hours.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=support@tasskly.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors mt-2"
              >
                support@tasskly.com &rarr;
              </a>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="h-full shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-5 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent mb-3">
                <MessageSquare className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Platform Queries</CardTitle>
              <CardDescription>For questions regarding bids, task execution, or platform guidelines.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <p className="text-xs text-muted-foreground mt-2">
                Refer to our online guides or mail support with your Job ID for faster response.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-4 pt-4">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <Card key={index} className="overflow-hidden shadow-sm border border-muted/60">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-4 text-left font-medium text-sm hover:bg-muted/30 transition-colors"
                >
                  <span className="text-foreground">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-muted/20 bg-muted/5">
                    {faq.a}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomerService;
