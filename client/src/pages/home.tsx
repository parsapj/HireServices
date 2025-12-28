import React, { useState } from "react";
import { usePasswordSystem, Service, GoogleFormConfig } from "@/lib/use-password-system";
import { Copy, Plus, Settings, Trash2, History, Calculator, RefreshCcw, Undo2, Save, RotateCcw, Link as LinkIcon, ExternalLink, Send, FileSpreadsheet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import bgPattern from "@assets/generated_images/subtle_technical_dot_grid_background_texture.png";

export default function Home() {
  const {
    services,
    activeService,
    activeServiceId,
    setActiveServiceId,
    generateNextPassword,
    addService,
    deleteService,
    updateServiceSettings,
    resetHistory,
    undoLastGeneration,
    setManualState,
    restoreFromHistory,
    integrations,
    updateGoogleFormConfig,
    updateInfoSheetUrl,
    logSubmission
  } = usePasswordSystem();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [manualIndex, setManualIndex] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  
  // Integration settings state
  const [infoSheetInput, setInfoSheetInput] = useState(integrations.infoSheetUrl || "");
  const [formLinkInput, setFormLinkInput] = useState("");
  const [googleFormConfig, setGoogleFormConfig] = useState<GoogleFormConfig>(integrations.googleForm || {
      formUrl: "",
      fieldMappings: {
          hireType: "",
          price: "",
          description: "",
          dateOfHire: "",
          timeOfHire: "",
          numberOfDays: "",
          phone: ""
      }
  });

  // Submission Form State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionData, setSubmissionData] = useState({
      hireType: "",
      price: "",
      description: "",
      dateOfHire: "",
      timeOfHire: "",
      numberOfDays: "",
      phone: ""
  });
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Password copied to clipboard.",
    });
  };

  // Pre-fill manual edit inputs when settings open or active service changes
  React.useEffect(() => {
    if (activeService) {
        setManualIndex(String(activeService.currentIndex));
        setManualPassword(String(activeService.currentPassword));
    }
  }, [activeService, isSettingsOpen]);

  // Sync settings inputs when loaded
  React.useEffect(() => {
      setInfoSheetInput(integrations.infoSheetUrl || "");
      if (integrations.googleForm) {
          setGoogleFormConfig(integrations.googleForm);
      }
  }, [integrations, isSettingsOpen]);

  const handleManualUpdate = () => {
    const idx = parseInt(manualIndex);
    const pwd = parseInt(manualPassword);
    
    if (isNaN(idx) || isNaN(pwd)) {
        toast({ title: "Invalid Input", description: "Please enter valid numbers.", variant: "destructive" });
        return;
    }
    
    setManualState(activeServiceId, idx, pwd);
  };
  
  const parseGoogleFormLink = () => {
      if (!formLinkInput) return;
      
      try {
        const url = new URL(formLinkInput);
        const params = new URLSearchParams(url.search);
        
        // Extract base URL (remove /viewform or /prefill and query params)
        let baseUrl = formLinkInput.split('?')[0];
        baseUrl = baseUrl.replace(/\/viewform.*/, '/formResponse').replace(/\/prefill.*/, '/formResponse');
        if (!baseUrl.endsWith('/formResponse')) {
            // Try to guess if it's a standard google form
            if (baseUrl.includes('docs.google.com/forms')) {
                 if (!baseUrl.endsWith('/')) baseUrl += '/';
                 baseUrl += 'formResponse';
            }
        }

        const newMappings = { ...googleFormConfig.fieldMappings };
        let found = 0;
        
        // Try to map any found entry.X parameters to our fields sequentially if they are empty
        const entries = Array.from(params.keys()).filter(k => k.startsWith('entry.'));
        
        // Start filling empty slots
        const fields = Object.keys(newMappings) as Array<keyof typeof newMappings>;
        
        entries.forEach((entry, i) => {
            if (i < fields.length) {
                newMappings[fields[i]] = entry;
                found++;
            }
        });

        setGoogleFormConfig({
            formUrl: baseUrl,
            fieldMappings: newMappings
        });
        
        toast({ title: "Link Parsed", description: `Found ${found} fields. Please verify mappings.` });
      } catch (e) {
          toast({ title: "Error", description: "Invalid URL", variant: "destructive" });
      }
  };
  
  const handleSubmitRecord = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!integrations.googleForm?.formUrl) {
          toast({ title: "Configuration Missing", description: "Please configure Google Form in Settings.", variant: "destructive" });
          return;
      }
      
      if (!submissionData.hireType) {
          toast({ title: "Missing Required Field", description: "Please select a Hire Type.", variant: "destructive" });
          return;
      }
      
      const config = integrations.googleForm;
      const params = new URLSearchParams();
      
      // Map our data to Google Form entry IDs
      if (config.fieldMappings.hireType && submissionData.hireType) params.append(config.fieldMappings.hireType, submissionData.hireType);
      if (config.fieldMappings.price && submissionData.price) params.append(config.fieldMappings.price, submissionData.price);
      if (config.fieldMappings.description && submissionData.description) params.append(config.fieldMappings.description, submissionData.description);
      if (config.fieldMappings.dateOfHire && submissionData.dateOfHire) params.append(config.fieldMappings.dateOfHire, submissionData.dateOfHire);
      if (config.fieldMappings.timeOfHire && submissionData.timeOfHire) params.append(config.fieldMappings.timeOfHire, submissionData.timeOfHire);
      if (config.fieldMappings.numberOfDays && submissionData.numberOfDays) params.append(config.fieldMappings.numberOfDays, submissionData.numberOfDays);
      if (config.fieldMappings.phone && submissionData.phone) params.append(config.fieldMappings.phone, submissionData.phone);
      
      try {
          const submitUrl = config.formUrl + '?' + params.toString();
          const img = new Image();
          img.src = submitUrl;
          
          logSubmission('success', submissionData.hireType);
          toast({ title: "Submitted", description: "Record sent to Google Form." });
          setIsSubmitModalOpen(false);
          setSubmissionData({
              hireType: "",
              price: "",
              description: "",
              dateOfHire: "",
              timeOfHire: "",
              numberOfDays: "",
              phone: ""
          });
      } catch (err) {
          console.error(err);
          logSubmission('error', submissionData.hireType);
          toast({ title: "Submission Failed", description: "Could not send data.", variant: "destructive" });
      }
  };

  return (
    <div 
      className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 font-sans text-foreground selection:bg-primary/20"
      style={{
        backgroundImage: `url(${bgPattern})`,
        backgroundSize: '400px',
        backgroundBlendMode: 'multiply'
      }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground/90">HirePass</h1>
            <p className="text-sm text-muted-foreground">Rolling Security System</p>
          </div>
          
          <div className="flex gap-2">
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-muted">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>System Settings</DialogTitle>
                    <DialogDescription>
                      Configure services, algorithm, and integrations.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="services" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="services">Services</TabsTrigger>
                      <TabsTrigger value="algorithm">Algorithm</TabsTrigger>
                      <TabsTrigger value="integrations">Integrations</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="services" className="space-y-4 py-4">
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input 
                            placeholder="New service name..." 
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newServiceName.trim()) {
                                addService(newServiceName);
                                setNewServiceName("");
                              }
                            }}
                          />
                          <Button 
                            onClick={() => {
                              if (newServiceName.trim()) {
                                addService(newServiceName);
                                setNewServiceName("");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add
                          </Button>
                        </div>
                        
                        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                          {services.map((service) => (
                            <div key={service.id} className="flex items-center justify-between py-2 group">
                              <div className="flex flex-col">
                                <span className="font-medium">{service.name}</span>
                                <span className="text-xs text-muted-foreground">Current Idx: {service.currentIndex}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {services.length > 1 && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => deleteService(service.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="algorithm" className="space-y-4 py-4">
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                            <div className="flex items-center gap-2">
                                 <Calculator className="h-4 w-4 text-muted-foreground" />
                                 <h4 className="text-sm font-medium">Manual Correction</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="manualIdx">Current Index</Label>
                                    <Input 
                                        id="manualIdx" 
                                        type="number" 
                                        value={manualIndex}
                                        onChange={(e) => setManualIndex(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="manualPass">Current Password</Label>
                                    <Input 
                                        id="manualPass" 
                                        type="number" 
                                        value={manualPassword}
                                        onChange={(e) => setManualPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button onClick={handleManualUpdate} className="w-full" variant="secondary">
                                <Save className="h-4 w-4 mr-2" /> Update State
                            </Button>
                        </div>

                        <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
                            <div className="flex items-center gap-2 mb-2">
                                <Settings className="h-4 w-4 text-muted-foreground" />
                                <h4 className="text-sm font-medium">Formula Parameters</h4>
                            </div>
                         
                         <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="multiplier">Multiplier</Label>
                              <Input 
                                id="multiplier" 
                                type="number" 
                                value={activeService.multiplier} 
                                onChange={(e) => updateServiceSettings(activeService.id, { multiplier: Number(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="addend">Addend</Label>
                              <Input 
                                id="addend" 
                                type="number" 
                                value={activeService.addend} 
                                onChange={(e) => updateServiceSettings(activeService.id, { addend: Number(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="modulus">Modulus</Label>
                              <Input 
                                id="modulus" 
                                type="number" 
                                value={activeService.modulus} 
                                onChange={(e) => updateServiceSettings(activeService.id, { modulus: Number(e.target.value) })}
                              />
                            </div>
                         </div>
                         
                         <div className="mt-2 p-2 bg-muted rounded text-xs font-mono text-center">
                           Formula: (prev * {activeService.multiplier} + {activeService.addend}) % {activeService.modulus}
                         </div>

                         <Separator className="my-2" />
                         
                         <div className="space-y-4">
                            <h4 className="text-sm font-medium">Reset Data</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startIdx">Current Index</Label>
                                    <Input 
                                        id="startIdx" 
                                        type="number" 
                                        value={activeService.currentIndex}
                                        onChange={(e) => updateServiceSettings(activeService.id, { currentIndex: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="startPass">Current Password</Label>
                                    <Input 
                                        id="startPass" 
                                        type="number" 
                                        value={activeService.currentPassword}
                                        onChange={(e) => updateServiceSettings(activeService.id, { currentPassword: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <Button 
                                variant="destructive" 
                                className="w-full"
                                onClick={() => resetHistory(activeService.id)}
                            >
                                <RefreshCcw className="h-4 w-4 mr-2" /> Clear History
                            </Button>
                         </div>
                      </div>
                    </div>
                    </TabsContent>
                    
                    <TabsContent value="integrations" className="space-y-4 py-4">
                        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                            <h4 className="font-medium flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4" /> Info Sheet
                            </h4>
                            <div className="space-y-2">
                                <Label>Google Sheet URL</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        value={infoSheetInput} 
                                        onChange={(e) => setInfoSheetInput(e.target.value)} 
                                        placeholder="https://docs.google.com/spreadsheets/..."
                                    />
                                    <Button onClick={() => updateInfoSheetUrl(infoSheetInput)} size="sm">Save</Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Link to the Google Sheet containing hire information.
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                            <h4 className="font-medium flex items-center gap-2">
                                <Send className="h-4 w-4" /> Google Form Submission
                            </h4>
                            
                            <div className="space-y-2">
                                <Label>Parser (Optional)</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Paste pre-filled link to auto-detect IDs" 
                                        value={formLinkInput}
                                        onChange={(e) => setFormLinkInput(e.target.value)}
                                    />
                                    <Button variant="outline" onClick={parseGoogleFormLink} size="sm">Parse</Button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Form Action URL (formResponse)</Label>
                                <Input 
                                    value={googleFormConfig.formUrl} 
                                    onChange={(e) => setGoogleFormConfig(p => ({...p, formUrl: e.target.value}))}
                                    placeholder="https://docs.google.com/forms/d/e/.../formResponse"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-xs">Hire Type ID</Label>
                                    <Input 
                                        placeholder="entry.123456" 
                                        value={googleFormConfig.fieldMappings.hireType}
                                        onChange={(e) => setGoogleFormConfig(p => ({...p, fieldMappings: {...p.fieldMappings, hireType: e.target.value}}))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Price ID</Label>
                                    <Input 
                                        placeholder="entry.123456" 
                                        value={googleFormConfig.fieldMappings.price}
                                        onChange={(e) => setGoogleFormConfig(p => ({...p, fieldMappings: {...p.fieldMappings, price: e.target.value}}))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Description ID</Label>
                                    <Input 
                                        placeholder="entry.123456" 
                                        value={googleFormConfig.fieldMappings.description}
                                        onChange={(e) => setGoogleFormConfig(p => ({...p, fieldMappings: {...p.fieldMappings, description: e.target.value}}))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Phone ID</Label>
                                    <Input 
                                        placeholder="entry.123456" 
                                        value={googleFormConfig.fieldMappings.phone}
                                        onChange={(e) => setGoogleFormConfig(p => ({...p, fieldMappings: {...p.fieldMappings, phone: e.target.value}}))}
                                    />
                                </div>
                            </div>
                            <Button className="w-full" onClick={() => updateGoogleFormConfig(googleFormConfig)}>Save Google Form Settings</Button>
                        </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
          </div>
        </div>

        <Card className="shadow-xl border-t-4 border-t-primary">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-xs font-semibold tracking-wider mb-2">Select Service</CardDescription>
            <Select value={activeServiceId} onValueChange={setActiveServiceId}>
              <SelectTrigger className="w-full text-lg font-medium h-12">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="cursor-pointer">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <span className="text-sm font-medium text-muted-foreground">Current Password (Index {activeService.currentIndex})</span>
              <div 
                className="flex items-center gap-3"
                role="group"
                aria-label="Current Password Display"
              >
                <div className="text-5xl font-mono font-bold tracking-tight tabular-nums text-foreground">
                    {String(activeService.currentPassword).padStart(5, '0')}
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => copyToClipboard(String(activeService.currentPassword))}
                >
                    <Copy className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
                <Button 
                    onClick={generateNextPassword} 
                    className="w-full h-14 text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
                >
                    Generate Next Password
                </Button>
                
                <div className="flex gap-2">
                     <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="secondary" className="flex-[2] h-12 shadow-md">
                                <Send className="h-4 w-4 mr-2" /> Submit Record
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md w-[95vw] rounded-xl">
                            <DialogHeader>
                                <DialogTitle>Submit Hire Record</DialogTitle>
                                <DialogDescription>Enter details to submit to Google Form</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmitRecord} className="space-y-4 py-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Hire Type</Label>
                                        <Select value={submissionData.hireType} onValueChange={v => setSubmissionData(p => ({...p, hireType: v}))}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Select service" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {services.map(s => (
                                                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Price</Label>
                                        <Input 
                                            type="number"
                                            className="h-10"
                                            value={submissionData.price} 
                                            onChange={e => setSubmissionData(p => ({...p, price: e.target.value}))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date of Hire</Label>
                                        <Input 
                                            type="date"
                                            className="h-10"
                                            value={submissionData.dateOfHire} 
                                            onChange={e => setSubmissionData(p => ({...p, dateOfHire: e.target.value}))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Time</Label>
                                        <Input 
                                            type="time"
                                            className="h-10"
                                            value={submissionData.timeOfHire} 
                                            onChange={e => setSubmissionData(p => ({...p, timeOfHire: e.target.value}))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>No. of Days</Label>
                                        <Input 
                                            type="number"
                                            className="h-10"
                                            value={submissionData.numberOfDays} 
                                            onChange={e => setSubmissionData(p => ({...p, numberOfDays: e.target.value}))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input 
                                            type="tel"
                                            className="h-10"
                                            value={submissionData.phone} 
                                            onChange={e => setSubmissionData(p => ({...p, phone: e.target.value}))}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label>Description</Label>
                                        <Input 
                                            className="h-10"
                                            value={submissionData.description} 
                                            onChange={e => setSubmissionData(p => ({...p, description: e.target.value}))}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="w-full h-11 text-base font-semibold">Submit to Google Form</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                     </Dialog>

                     <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={undoLastGeneration}
                        disabled={!activeService.history.length || activeService.history.length < 2}
                        title="Undo Last Password Generation"
                     >
                        <Undo2 className="h-4 w-4" />
                     </Button>
                </div>

                <Button 
                    variant={integrations.infoSheetUrl ? "outline" : "ghost"}
                    className="w-full h-12 gap-2 mt-1 border-dashed"
                    onClick={() => {
                        if (integrations.infoSheetUrl) {
                            const sheetUrl = integrations.infoSheetUrl;
                            if (sheetUrl.includes("docs.google.com/spreadsheets")) {
                                const sheetsDeepLink = sheetUrl.replace("https://", "googlesheets://");
                                window.location.href = sheetsDeepLink;
                                setTimeout(() => {
                                    window.open(sheetUrl, '_blank');
                                }, 500);
                            } else {
                                window.open(sheetUrl, '_blank');
                            }
                        } else {
                            setIsSettingsOpen(true);
                        }
                    }}
                    title={integrations.infoSheetUrl ? "Open Info Sheet" : "Configure Info Sheet URL in Settings"}
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    {integrations.infoSheetUrl ? "Open Info Sheet" : "Set Info Sheet URL"}
                </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/10">
                <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">History</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                    <div className="divide-y">
                        {activeService.history.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No history yet. Generate a password to start tracking.
                            </div>
                        ) : (
                            activeService.history.map((entry, i) => (
                                <div key={`${entry.index}-${entry.timestamp}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Index {entry.index}</span>
                                        <span className="text-xs text-muted-foreground/70">{format(entry.timestamp, 'MMM d, HH:mm')}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-medium text-lg tabular-nums">
                                            {String(entry.password).padStart(5, '0')}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                            title="Revert to this point"
                                            onClick={() => {
                                                if (confirm(`Revert state to Index ${entry.index}? Future history will be removed.`)) {
                                                    restoreFromHistory(entry);
                                                }
                                            }}
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
