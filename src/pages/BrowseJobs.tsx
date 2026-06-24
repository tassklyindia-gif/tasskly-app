import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal } from "lucide-react";
import { categories } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import JobCard from "@/components/JobCard";
import Navbar from "@/components/Navbar";

const BrowseJobs = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") || "";
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);

  const { jobs, profile, refreshJobs } = useApp();

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  const filteredJobs = jobs.filter((job) => {
    if (job.status !== "open") return false;
    
    const matchesSearch =
      !search ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || job.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Browse Jobs</h1>
          <p className="mt-1 text-muted-foreground">
            {filteredJobs.length} jobs available
          </p>
        </div>

        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <Badge
            variant={!selectedCategory ? "default" : "category"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory("")}
          >
            All
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat.name}
              variant={selectedCategory === cat.name ? "default" : "category"}
              className="cursor-pointer"
              onClick={() =>
                setSelectedCategory(selectedCategory === cat.name ? "" : cat.name)
              }
            >
              {cat.icon} {cat.name}
            </Badge>
          ))}
        </div>

        {filteredJobs.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground">No jobs found matching your criteria.</p>
            <Button variant="ghost" className="mt-4" onClick={() => { 
                setSearch(""); 
                setSelectedCategory(""); 
              }}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseJobs;
