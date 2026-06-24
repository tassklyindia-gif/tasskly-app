import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, Sparkles, AlertTriangle, CreditCard } from "lucide-react";
import { categories } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { FileUp, X, Loader2 } from "lucide-react";

const PostJob = () => {
  const navigate = useNavigate();
  const { addJob, recordPostingFee, profile, refreshProfile, refreshJobs, updateMyJobs } = useApp();
  
  // UPI Modal States
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [tempUpi, setTempUpi] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  
  // New Feature States
  const [isOnTimeWork, setIsOnTimeWork] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const addTeamRole = () => {
    if (teamRoleInput.trim() && !teamRoles.includes(teamRoleInput.trim())) {
      setTeamRoles([...teamRoles, teamRoleInput.trim()]);
      setTeamRoleInput("");
    }
  };

  const removeTeamRole = (role: string) => {
    setTeamRoles(teamRoles.filter((r) => r !== role));
  };

  const getMinDeadline = () => {
    const d = new Date();
    // Regular work needs 2 days.
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  };


  const handleSaveUpi = async () => {
    if (!tempUpi.trim()) {
      toast.error("Please enter your UPI ID");
      return;
    }
    if (!tempUpi.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g. name@bank)");
      return;
    }

    setSavingUpi(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ upi_id: tempUpi.trim() })
        .eq("id", profile!.id);

      if (error) throw error;

      toast.success("UPI ID saved successfully! ✅");
      setShowUpiModal(false);
      await refreshProfile(); 
      // Re-trigger submit after saving
      setTimeout(() => handleSubmit(), 200);
    } catch (err: any) {
      toast.error("Failed to save UPI ID: " + err.message);
    } finally {
      setSavingUpi(false);
    }
  };

  const handleSubmit = () => {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      toast.error("🔔 Notification Permission Required", {
        description: "You must enable browser notifications to post a job. Please enable notifications and try again.",
      });
      Notification.requestPermission();
      return;
    }

    // Check UPI ID first
    const upiId = (profile as any)?.upi_id;
    if (!upiId) {
      setShowUpiModal(true);
      return;
    }

    if (!title.trim() || !description.trim() || !category || !deadline) {
      toast.error("Please fill in all required fields (Title, Description, Category, Deadline)");
      return;
    }
    if (skills.length === 0) {
      toast.error("Please add at least one required skill for the worker.");
      return;
    }
    if (!budget) {
      toast.error("Please provide a budget.");
      return;
    }
    const minDate = getMinDeadline();
    if (deadline < minDate) {
      toast.error(`Deadline must be at least 2 days from today.`);
      return;
    }
    
    if (!selectedFile) {
      toast.error("You must upload a project file or brief to post this job.");
      return;
    }

    if (!agreedToTerms) {
      toast.error("You must agree to the refund policy terms to post a job.");
      return;
    }
    
    const numericBudget = Number(budget);
    if (isNaN(numericBudget) || numericBudget < 150) {
      toast.error("Please enter a valid budget of at least ₹150");
      return;
    }

    const jobPayload = {
      title: title.trim(),
      description: description.trim(),
      category,
      budget: numericBudget,
      deadline,
      skills,
      isQuickTask: false,
      campusOnly: false,
      campusName: undefined,
      isUrgent: false,
      urgentTime: undefined,
      isTeamTask: false,
      teamRoles: undefined,
      isMentoring: false,
      rescueMode: false,
    };

    const runSubmission = async () => {
      setIsSubmitting(true);
      try {
        const result = await addJob(jobPayload);
        
        if (result && selectedFile) {
          setUploadingFile(true);
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${result.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('job-files')
            .upload(filePath, selectedFile);

          if (uploadError) {
            toast.error("Job posted, but file upload failed: " + uploadError.message);
          } else {
            await (supabase as any).from('job_files').insert({
              job_id: result.id,
              uploader_id: (await supabase.auth.getUser()).data.user?.id,
              file_url: filePath,
              file_name: selectedFile.name,
              file_type: selectedFile.type,
              is_submission: false,
              is_watermarked: false
            });
            toast.success("File uploaded successfully!");
          }
        }
        
        if (result) {
          toast.success("Job posted successfully!");
          await refreshJobs();
          await updateMyJobs();
          navigate("/dashboard/jobs");
        }
      } catch (err: any) {
        toast.error("Error: " + err.message);
      } finally {
        setIsSubmitting(false);
        setUploadingFile(false);
      }
    };

    runSubmission();
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-background pb-12">
      <Navbar />

      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">Post a Job</h1>
          <p className="mt-1 mb-8 text-muted-foreground">Describe what you need done and how you want to pay.</p>



          <Card className="shadow-card">

            <CardContent className="space-y-6 p-6">
              
              {/* Basic Details */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Job Title *</label>
                  <Input
                    placeholder="e.g. Design a poster for college event"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Description *</label>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Describe the job requirements, deliverables, and any specific instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Category *</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Badge
                        key={cat.name}
                        variant={category === cat.name ? "default" : "category"}
                        className="cursor-pointer"
                        onClick={() => setCategory(cat.name)}
                      >
                        {cat.icon} {cat.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Toggles Removed */}

              {/* Payment & Deadline */}
              <div className="pt-4 border-t space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Budget (₹) *</label>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Deadline *</label>
                    <Input
                      type="date"
                      value={deadline}
                      min={getMinDeadline()}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      ⚠️ Please select the deadline 2 days before submission.
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills Area */}
              <div className="pt-4 border-t">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Required Skills for Worker *</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a required skill..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  />
                  <Button variant="outline" onClick={addSkill}>Add</Button>
                </div>
                {skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeSkill(skill)}
                      >
                        {skill} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* File Upload Section */}
              <div className="pt-4 border-t">
                <label className="mb-2 block text-sm font-medium text-foreground">Project Files / Brief</label>
                <div className="flex flex-col gap-2">
                  {!selectedFile ? (
                    <div className="relative border-2 border-dashed border-muted rounded-xl p-8 transition-colors hover:border-primary/50 group">
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <FileUp className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, Word, Images, or Zip (Max 10MB)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center text-primary">
                          <FileUp className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setSelectedFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Terms Checkbox */}
              <div className="pt-4 border-t">
                <div className="flex items-start space-x-3 bg-muted/30 p-4 rounded-lg border border-primary/10">
                  <Checkbox 
                    id="terms" 
                    checked={agreedToTerms} 
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} 
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the Refund Policy
                    </label>
                    <p className="text-xs text-muted-foreground">
                      By posting this job, I agree that if I reject the submitted work, I will receive a 70% refund, 25% will compensate the worker for their time, and 5% is charged as a platform fee.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button variant="hero" className="w-full gap-2 mt-4" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSubmitting ? "Posting..." : "Post Job"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* UPI ID Prompt Modal */}
      <Dialog open={showUpiModal} onOpenChange={setShowUpiModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              UPI ID Required
            </DialogTitle>
            <DialogDescription>
              Please provide your UPI ID to receive payouts and proceed with posting this job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-left">
            <div className="space-y-2">
               <Label htmlFor="temp-upi">UPI ID *</Label>
               <Input
                 id="temp-upi"
                 value={tempUpi}
                 onChange={(e) => setTempUpi(e.target.value)}
                 placeholder="e.g. 9876543210@paytm"
                 className="font-medium"
               />
               <p className="text-[10px] text-muted-foreground leading-relaxed">
                 Enter a valid UPI ID (e.g., number@bank or name@bank). This is required to process and release assignment payments.
               </p>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowUpiModal(false)}>
              Cancel
            </Button>
            <Button type="button" variant="hero" onClick={handleSaveUpi} disabled={savingUpi}>
              {savingUpi ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PostJob;
