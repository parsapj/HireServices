import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export interface PasswordHistory {
  index: number;
  password: number;
  timestamp: number;
}

export interface Service {
  id: string;
  name: string;
  currentIndex: number;
  currentPassword: number;
  multiplier: number;
  addend: number;
  modulus: number;
  history: PasswordHistory[];
}

export interface GoogleFormConfig {
  formUrl: string;
  fieldMappings: {
    hireType: string;
    price: string;
    description: string;
    dateOfHire: string;
    timeOfHire: string;
    numberOfDays: string;
    phone: string;
  };
}

export interface IntegrationSettings {
  googleForm?: GoogleFormConfig;
  infoSheetUrl?: string;
  submissions: Array<{
    timestamp: number;
    status: 'success' | 'error';
    serviceName: string;
  }>;
}

const DEFAULT_SERVICE: Service = {
  id: "default",
  name: "(G) Trailer",
  currentIndex: 0,
  currentPassword: 41378,
  multiplier: 7,
  addend: 386,
  modulus: 100000,
  history: [],
};

const STORAGE_KEY = "hirepass-data-v1";
const INTEGRATIONS_KEY = "hirepass-integrations-v1";

export function usePasswordSystem() {
  // Load from local storage or default
  const [services, setServices] = useState<Service[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
    return [DEFAULT_SERVICE];
  });
  
  const [integrations, setIntegrations] = useState<IntegrationSettings>(() => {
    try {
        const stored = localStorage.getItem(INTEGRATIONS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load integration settings", e);
    }
    return { submissions: [] };
  });

  const [activeServiceId, setActiveServiceId] = useState<string>(() => {
    return services[0]?.id || "";
  });

  // Persist to local storage whenever services change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
  }, [services]);
  
  useEffect(() => {
    localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations));
  }, [integrations]);

  const activeService = services.find((s) => s.id === activeServiceId) || services[0];

  const generateNextPassword = () => {
    if (!activeService) return;

    const nextPassword =
      (activeService.currentPassword * activeService.multiplier + activeService.addend) %
      activeService.modulus;
    
    const nextIndex = activeService.currentIndex + 1;

    const newHistoryItem: PasswordHistory = {
      index: nextIndex,
      password: nextPassword,
      timestamp: Date.now(),
    };

    const updatedService = {
      ...activeService,
      currentPassword: nextPassword,
      currentIndex: nextIndex,
      history: [newHistoryItem, ...activeService.history].slice(0, 50), // Keep last 50
    };

    setServices((prev) =>
      prev.map((s) => (s.id === activeServiceId ? updatedService : s))
    );
    
    toast({
      title: "Password Generated",
      description: `Index ${nextIndex}: ${nextPassword}`,
    });
  };

  const addService = (name: string, initialPassword?: number, multiplier?: number, addend?: number, modulus?: number) => {
    const newService: Service = {
      id: crypto.randomUUID(),
      name,
      currentIndex: 0,
      currentPassword: initialPassword ?? DEFAULT_SERVICE.currentPassword,
      multiplier: multiplier ?? DEFAULT_SERVICE.multiplier,
      addend: addend ?? DEFAULT_SERVICE.addend,
      modulus: modulus ?? DEFAULT_SERVICE.modulus,
      history: [], 
    };
    setServices((prev) => [...prev, newService]);
    setActiveServiceId(newService.id);
    toast({ title: "Service Created", description: `Added ${name}` });
  };

  const deleteService = (id: string) => {
    if (services.length <= 1) {
      toast({ title: "Cannot delete", description: "You must have at least one service.", variant: "destructive" });
      return;
    }
    const newServices = services.filter((s) => s.id !== id);
    setServices(newServices);
    if (activeServiceId === id) {
      setActiveServiceId(newServices[0].id);
    }
    toast({ title: "Service Deleted" });
  };

  const updateServiceSettings = (
    id: string,
    updates: Partial<Pick<Service, "name" | "currentPassword" | "currentIndex" | "multiplier" | "addend" | "modulus">>
  ) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    toast({ title: "Settings Updated" });
  };

  const resetHistory = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, history: [] } : s))
    );
    toast({ title: "History Cleared" });
  };

  const undoLastGeneration = () => {
    if (!activeService || activeService.history.length === 0) return;
    
    const previousEntry = activeService.history[1];
    
    if (previousEntry) {
       const newHistory = activeService.history.slice(1);
       setServices((prev) =>
        prev.map((s) => (s.id === activeServiceId ? { 
            ...s, 
            currentPassword: previousEntry.password,
            currentIndex: previousEntry.index,
            history: newHistory
        } : s))
      );
      toast({ title: "Undone", description: `Reverted to index ${previousEntry.index}` });
    } else {
        toast({ title: "Cannot Undo", description: "No previous history available to revert to.", variant: "destructive" });
    }
  };

  const setManualState = (id: string, index: number, password: number) => {
    const newEntry: PasswordHistory = {
        index,
        password,
        timestamp: Date.now()
    };
    
    setServices((prev) =>
        prev.map((s) => {
            if (s.id !== id) return s;
            return {
                ...s,
                currentIndex: index,
                currentPassword: password,
                history: [newEntry, ...s.history]
            };
        })
    );
    toast({ title: "State Updated", description: `Set to Index ${index}` });
  };
  
  const restoreFromHistory = (historyEntry: PasswordHistory) => {
       if (!activeService) return;
       
       const entryIndex = activeService.history.findIndex(h => h.index === historyEntry.index && h.password === historyEntry.password);
       if (entryIndex === -1) return;
       
       const newHistory = activeService.history.slice(entryIndex);
       
       setServices((prev) => 
        prev.map((s) => (s.id === activeServiceId ? {
            ...s,
            currentIndex: historyEntry.index,
            currentPassword: historyEntry.password,
            history: newHistory
        } : s))
       );
       toast({ title: "Restored", description: `Reverted to Index ${historyEntry.index}` });
  };
  
  const updateGoogleFormConfig = (config: GoogleFormConfig) => {
      setIntegrations(prev => ({
          ...prev,
          googleForm: config
      }));
      toast({ title: "Configuration Saved", description: "Google Form settings updated." });
  };
  
  const updateInfoSheetUrl = (url: string) => {
      setIntegrations(prev => ({
          ...prev,
          infoSheetUrl: url
      }));
      toast({ title: "Configuration Saved", description: "Info Sheet URL updated." });
  };
  
  const logSubmission = (status: 'success' | 'error', serviceName: string) => {
      setIntegrations(prev => ({
          ...prev,
          submissions: [
              { timestamp: Date.now(), status, serviceName },
              ...(prev.submissions || []).slice(0, 19) // Keep last 20 logs
          ]
      }));
  };

  return {
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
  };
}
