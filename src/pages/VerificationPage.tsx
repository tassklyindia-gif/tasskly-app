import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useVerification } from "@/hooks/useVerification";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, AlertTriangle, Clock, Upload, User, Camera, FileText, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const VerificationPage = () => {
  const { profile } = useApp();
  const { fetchMyVerificationStatus, submitVerification, loading } = useVerification();
  
  const [status, setStatus] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [idType, setIdType] = useState<'student_id' | 'aadhaar' | 'pan'>('student_id');
  const [idNumber, setIdNumber] = useState("");
  const [files, setFiles] = useState<{
    front: File | null;
    back: File | null;
    selfie: File | null;
  }>({ front: null, back: null, selfie: null });
  
  const [previews, setPreviews] = useState<{
    front: string | null;
    back: string | null;
    selfie: string | null;
  }>({ front: null, back: null, selfie: null });

  const loadStatus = useCallback(async () => {
    if (profile?.id && !status) { // Only fetch if we don't have it yet to prevent loops
      const data = await fetchMyVerificationStatus(profile.id);
      if (data) setStatus(data);
    }
  }, [profile?.id, status, fetchMyVerificationStatus]);

  useEffect(() => {
    loadStatus();
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie') => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateId = () => {
    if (idType === 'aadhaar') return /^\d{12}$/.test(idNumber);
    if (idType === 'pan') return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(idNumber);
    return idNumber.length >= 4;
  };

  const canProceed = () => {
    if (step === 1) return !!idType;
    if (step === 2) return validateId();
    if (step === 3) {
      const basic = !!files.front && !!files.selfie;
      if (idType !== 'student_id') return basic && !!files.back;
      return basic;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!profile?.id || !files.front || !files.selfie) return;

    if (!validateId()) {
      toast.error(`Invalid ${idType.replace('_', ' ')} number format`);
      return;
    }
    
    const success = await submitVerification(profile.id, {
      idType,
      idNumber,
      frontImage: files.front,
      backImage: files.back || undefined,
      selfie: files.selfie
    });

    if (success) {
      loadStatus();
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Account Setup in Progress</h2>
          <p className="text-muted-foreground max-w-xs mx-auto text-sm">
            We're still setting up your profile. Please Wait a few seconds or try refreshing the page.
          </p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Refresh Page
        </Button>
      </div>
    );
  }

  if (!status) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-foreground">Get Verified</h1>
        <p className="text-muted-foreground">
          Verified profiles get <span className="text-primary font-bold">3x more job acceptances</span> and unlock higher budget tasks.
        </p>
      </div>

      {/* Status Banners */}
      <AnimatePresence mode="wait">
        {status.verification_status === 'verified' ? (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-green-800">You are verified!</p>
              <p className="text-sm text-green-700">Your profile now carries the verified badge for all clients to see.</p>
            </div>
          </motion.div>
        ) : status.verification_status === 'pending' ? (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-amber-800">Your verification is under review</p>
              <p className="text-sm text-amber-700">We're checking your documents. This usually takes less than 24 hours.</p>
            </div>
          </motion.div>
        ) : status.verification_status === 'rejected' ? (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-red-800">Verification rejected</p>
              <p className="text-sm text-red-700">Please review the requirements and re-submit your documents.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-blue-800">Complete verification to unlock full access</p>
              <p className="text-sm text-blue-700">Start the process below to become a trusted member of Tasskly.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(status.verification_status === 'unverified' || status.verification_status === 'rejected') && (
        <Card className="shadow-card border-none overflow-hidden">
          <CardContent className="p-0">
            {/* Form Header */}
            <div className="bg-muted/30 p-6 border-b flex items-center justify-between">
              <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-2 w-12 rounded-full transition-colors ${step >= i ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step {step} of 3</span>
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold">Select ID Type</h2>
                      <p className="text-sm text-muted-foreground">Choose the document you'd like to use for verification.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'student_id', label: 'Student ID', icon: User, desc: 'College/University ID card' },
                        { id: 'aadhaar', label: 'Aadhaar', icon: Shield, desc: 'Official 12-digit Indian ID' },
                        { id: 'pan', label: 'PAN Card', icon: FileText, desc: 'Tax identification card' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => setIdType(type.id as any)}
                          className={`p-6 rounded-xl border-2 text-left transition-all ${idType === type.id ? 'border-primary bg-primary/5 shadow-md' : 'border-muted hover:border-primary/30'}`}
                        >
                          <type.icon className={`h-8 w-8 mb-4 ${idType === type.id ? 'text-primary' : 'text-muted-foreground'}`} />
                          <p className="font-bold text-foreground">{type.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold">Enter ID Details</h2>
                      <p className="text-sm text-muted-foreground">Make sure the number matches exactly as shown on your card.</p>
                    </div>

                    <div className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="idNumber">
                          {idType === 'student_id' ? "Student ID Number" : 
                           idType === 'aadhaar' ? "Aadhaar Number (12 digits)" : "PAN Number"}
                        </Label>
                        <Input
                          id="idNumber"
                          placeholder={idType === 'aadhaar' ? "0000 0000 0000" : "Enter ID number"}
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                          className="text-lg font-bold tracking-wider"
                        />
                        {!validateId() && idNumber.length > 0 && (
                          <p className="text-[10px] text-red-500 font-bold uppercase">
                            Invalid {idType.replace('_', ' ')} format
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                   >
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold">Upload Documents</h2>
                      <p className="text-sm text-muted-foreground">Upload clear photos of your ID. Files must be under 5MB.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Front Image */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Front of ID</Label>
                        <div className={`relative aspect-[3/2] rounded-xl border-2 border-dashed overflow-hidden transition-all ${previews.front ? 'border-primary' : 'border-muted hover:border-primary/20'}`}>
                          {previews.front ? (
                            <img src={previews.front} className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                              <Camera className="h-6 w-6" />
                              <span className="text-[10px] font-bold">Click to Upload</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'front')} />
                        </div>
                      </div>

                      {/* Back Image (Conditional) */}
                      {idType !== 'student_id' && (
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Back of ID</Label>
                          <div className={`relative aspect-[3/2] rounded-xl border-2 border-dashed overflow-hidden transition-all ${previews.back ? 'border-primary' : 'border-muted hover:border-primary/20'}`}>
                            {previews.back ? (
                              <img src={previews.back} className="w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                <Camera className="h-6 w-6" />
                                <span className="text-[10px] font-bold">Click to Upload</span>
                              </div>
                            )}
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'back')} />
                          </div>
                        </div>
                      )}

                      {/* Selfie */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Selfie with ID</Label>
                        <div className={`relative aspect-[3/2] rounded-xl border-2 border-dashed overflow-hidden transition-all ${previews.selfie ? 'border-primary' : 'border-muted hover:border-primary/20'}`}>
                          {previews.selfie ? (
                            <img src={previews.selfie} className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                              <User className="h-6 w-6" />
                              <span className="text-[10px] font-bold">Click to Upload</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'selfie')} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="mt-12 flex justify-between items-center bg-muted/50 -mx-8 -mb-8 p-6 px-8 border-t">
                <Button
                  variant="ghost"
                  disabled={step === 1 || loading}
                  onClick={() => setStep(s => s - 1)}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>

                {step < 3 ? (
                  <Button
                    variant="hero"
                    disabled={!canProceed()}
                    onClick={() => setStep(s => s + 1)}
                    className="gap-2"
                  >
                    Next Step <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="hero"
                    disabled={!canProceed() || loading}
                    onClick={handleSubmit}
                    className="gap-2 min-w-[150px]"
                  >
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Submit for Verification <CheckCircle className="h-4 w-4" /></>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VerificationPage;
