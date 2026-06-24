import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import { CheckCircle, Award, Calendar, FolderOutput } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Portfolio = () => {
  const { jobs, profile } = useApp();

  if (!profile) return null;

  // Find jobs this user has completed as a freelancer
  const myCompletedGigs = jobs.filter(
    j => j.worker_id === profile.id && j.status === "completed"
  );

  // Find jobs this user posted that are completed
  const myCompletedPostings = jobs.filter(j => j.poster_id === profile.id && j.status === "completed");

  const allPortfolioItems = [...myCompletedGigs, ...myCompletedPostings];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <FolderOutput className="h-6 w-6 text-primary" />
          Automatic Portfolio
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every task you complete is automatically added here. Build your resume as you earn!
        </p>
      </div>

      {allPortfolioItems.length === 0 ? (
        <Card className="shadow-sm border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">Your portfolio is empty</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Complete your first job or hire someone to complete a task to start building your automatic portfolio!
            </p>
            <Link to="/jobs" className="mt-6 text-primary hover:underline text-sm font-medium">
              Browse available tasks →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allPortfolioItems.map((job, index) => {
            if (!job) return null;
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="category">{job.category}</Badge>
                      <Badge className="bg-green-500 gap-1"><CheckCircle className="w-3 h-3" /> Done</Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight line-clamp-2">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                      <Calendar className="w-3 h-3"/> {job.deadline && !isNaN(Date.parse(job.deadline)) ? new Date(job.deadline).toLocaleDateString() : "No deadline"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 mt-auto">
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="text-xs bg-secondary/50">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Portfolio;
