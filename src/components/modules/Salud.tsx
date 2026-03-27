import { Plus, FileText, Activity, Calendar, Weight, Thermometer, Heart, Pill, Save, X, Search, Filter, ShoppingCart, DollarSign, Trash2, Stethoscope, ClipboardList, Syringe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import Table from '../ui/Table';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { FormField, Input, Textarea } from '../ui/FormField';
import { showSuccess, showError } from '../../utils/messages';
import { getMedications, type Medication } from '../../services/medications';
import { getDiagnoses, type Diagnosis } from '../../services/diagnoses';
import { getTreatments, type Treatment } from '../../services/treatments';
import { createPrescription } from '../../services/prescriptions';

const PENDING_CONSULTATION_APPOINTMENT_KEY = 'pendingConsultationAppointmentId';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  owner_name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface BillableItem {
  type: 'product' | 'service';
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

interface PrescriptionItem {
  medication_id?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  quantity: string;
  route: string;
  instructions?: string;
}

interface DiagnosisItem {
  diagnosis_id?: string;
  diagnosis_name: string;
  notes?: string;
  is_primary: boolean;
}

interface TreatmentItem {
  treatment_id?: string;
  treatment_name: string;
  instructions?: string;
  start_date: string;
  end_date?: string;
}

interface VaccineItem {
  vaccine_id?: string;
  vaccine_name: string;
  batch_number?: string;
  expiry_date?: string;
  dose_number: number;
  next_dose_date?: string;
  price: number;
  notes?: string;
}

interface VaccineCatalog {
  id: string;
  name: string;
  description: string | null;
  species: string[];
  manufacturer: string | null;
  dose_ml: number | null;
  price: number;
  interval_days: number;
  required_doses: number;
  is_required: boolean;
  min_age_weeks: number;
}

interface Consultation {
  id: string;
  date: string;
  pet_id: string;
  pet_name: string;
  pet_species: string;
  owner_name: string;
  veterinarian_name: string;
  reason: string;
  diagnosis: string;
  status: string;
  weight: number;
  temperature: number;
  total_amount: number;
  billed: boolean;
}

interface ConsultationForm {
  pet_id: string;
  appointment_id?: string;
  reason: string;
  symptoms: string;
  weight: string;
  temperature: string;
  heart_rate: string;
  notes: string;
  billable_items: BillableItem[];
  diagnoses: DiagnosisItem[];
  vaccines: VaccineItem[];
  treatments: TreatmentItem[];
  prescriptions: PrescriptionItem[];
}

interface OwnerSummary {
  first_name?: string | null;
  last_name?: string | null;
}

const formatOwnerName = (owner?: OwnerSummary | null) => {
  const fullName = [owner?.first_name, owner?.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ');

  return fullName || 'Sin dueno';
};

const isRelationCacheError = (error: unknown) => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST200';
};

const panelClassName = 'rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-200/60';
const softSectionClassName = 'rounded-2xl border border-slate-200 bg-slate-50/90 p-4';
const subtleInputClassName = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
const accentButtonClassName = 'inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700';

export default function Salud() {
  const { currentTenant } = useTenant();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showVaccineModal, setShowVaccineModal] = useState(false);
  const [vaccineCatalog, setVaccineCatalog] = useState<VaccineCatalog[]>([]);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);
  const [clinicalCatalogsLoaded, setClinicalCatalogsLoaded] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [formData, setFormData] = useState<ConsultationForm>({
    pet_id: '',
    appointment_id: undefined,
    reason: '',
    symptoms: '',
    weight: '',
    temperature: '',
    heart_rate: '',
    notes: '',
    billable_items: [],
    diagnoses: [],
    vaccines: [],
    treatments: [],
    prescriptions: []
  });

  useEffect(() => {
    if (currentTenant) {
      loadConsultations();
      setCatalogsLoaded(false);
      setClinicalCatalogsLoaded(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    if (currentTenant) {
      void loadPendingAppointmentConsultation();
    }
  }, [currentTenant]);

  useEffect(() => {
    if (!currentTenant) {
      return;
    }

    const handleConsultationBilled = () => {
      void loadConsultations();
    };

    window.addEventListener('consultation:billing-updated', handleConsultationBilled);
    return () => window.removeEventListener('consultation:billing-updated', handleConsultationBilled);
  }, [currentTenant]);

  const loadPendingAppointmentConsultation = async () => {
    const pendingAppointmentId = window.sessionStorage.getItem(PENDING_CONSULTATION_APPOINTMENT_KEY);

    if (!currentTenant || !pendingAppointmentId) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, pet_id, reason, notes, status')
        .eq('tenant_id', currentTenant.id)
        .eq('id', pendingAppointmentId)
        .single();

      if (error) throw error;

      window.sessionStorage.removeItem(PENDING_CONSULTATION_APPOINTMENT_KEY);

      await ensureConsultationFormCatalogs();

      resetForm();
      setSelectedConsultation(null);
      setFormData({
        pet_id: data.pet_id,
        appointment_id: data.id,
        reason: data.reason || '',
        symptoms: '',
        weight: '',
        temperature: '',
        heart_rate: '',
        notes: data.notes || '',
        billable_items: [],
        diagnoses: [],
        vaccines: [],
        treatments: [],
        prescriptions: []
      });
      setShowModal(true);
    } catch (error) {
      window.sessionStorage.removeItem(PENDING_CONSULTATION_APPOINTMENT_KEY);
      console.error('Error loading pending appointment consultation:', error);
      showError('Error al abrir la cita desde agenda');
    }
  };

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          id,
          date,
          pet_id,
          reason,
          diagnosis,
          status,
          weight,
          temperature,
          total_amount,
          billed,
          pet:pets(name, species, owner:owners!owner_id(first_name, last_name)),
          veterinarian:profiles!consultations_veterinarian_id_fkey(display_name)
        `)
        .eq('tenant_id', currentTenant!.id)
        .order('date', { ascending: false });

      if (error) throw error;

      const formatted = data?.map((c: any) => ({
        id: c.id,
        date: c.date,
        pet_id: c.pet_id,
        pet_name: c.pet?.name || 'N/A',
        pet_species: c.pet?.species || 'N/A',
        owner_name: formatOwnerName(c.pet?.owner),
        veterinarian_name: c.veterinarian?.display_name || 'N/A',
        reason: c.reason,
        diagnosis: c.diagnosis || '',
        status: c.status,
        weight: c.weight,
        temperature: c.temperature,
        total_amount: c.total_amount,
        billed: c.billed || false
      })) || [];

      setConsultations(formatted);
    } catch (error) {
      console.error('Error loading consultations:', error);
      showError(isRelationCacheError(error)
        ? 'Error de relacion al cargar las consultas'
        : 'Error al cargar las consultas');
    } finally {
      setLoading(false);
    }
  };

  const loadPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, species, breed, owner:owners!owner_id(first_name, last_name)')
        .eq('tenant_id', currentTenant!.id)
        .order('name');

      if (error) throw error;

      const formatted = data?.map((p: any) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        breed: p.breed,
        owner_name: formatOwnerName(p.owner)
      })) || [];

      setPets(formatted);
    } catch (error) {
      console.error('Error loading pets:', error);
      showError(isRelationCacheError(error)
        ? 'Error de relacion al cargar las mascotas'
        : 'Error al cargar las mascotas');
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock')
        .eq('tenant_id', currentTenant!.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price')
        .eq('tenant_id', currentTenant!.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadMedications = async () => {
    try {
      const data = await getMedications(currentTenant!.id);
      setMedications(data);
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  const loadDiagnoses = async () => {
    try {
      const data = await getDiagnoses(currentTenant!.id);
      setDiagnoses(data);
    } catch (error) {
      console.error('Error loading diagnoses:', error);
    }
  };

  const loadTreatments = async () => {
    try {
      const data = await getTreatments(currentTenant!.id);
      setTreatments(data);
    } catch (error) {
      console.error('Error loading treatments:', error);
    }
  };

  const loadVaccineCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('system_parameters')
        .select('*')
        .eq('tenant_id', currentTenant!.id)
        .eq('type', 'vaccine')
        .eq('is_active', true)
        .order('sort_order')
        .order('name');

      if (error) throw error;

      const vaccines: VaccineCatalog[] = (data || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        species: v.value?.species || ['perro', 'gato'],
        manufacturer: v.value?.manufacturer || null,
        dose_ml: v.value?.dose_ml || null,
        price: v.value?.price || 0,
        interval_days: v.value?.interval_days || 365,
        required_doses: v.value?.required_doses || 1,
        is_required: v.value?.is_required || false,
        min_age_weeks: v.value?.min_age_weeks || 6
      }));

      setVaccineCatalog(vaccines);
    } catch (error) {
      console.error('Error loading vaccine catalog:', error);
    }
  };

  const ensureBaseCatalogsLoaded = async () => {
    if (!currentTenant || catalogsLoaded || catalogLoading) {
      return;
    }

    try {
      setCatalogLoading(true);
      await Promise.all([loadPets(), loadProducts(), loadServices()]);
      setCatalogsLoaded(true);
    } finally {
      setCatalogLoading(false);
    }
  };

  const ensureClinicalCatalogsLoaded = async () => {
    if (!currentTenant || clinicalCatalogsLoaded || catalogLoading) {
      return;
    }

    try {
      setCatalogLoading(true);
      await Promise.all([loadMedications(), loadDiagnoses(), loadTreatments(), loadVaccineCatalog()]);
      setClinicalCatalogsLoaded(true);
    } finally {
      setCatalogLoading(false);
    }
  };

  const ensureConsultationFormCatalogs = async () => {
    await ensureBaseCatalogsLoaded();
    await ensureClinicalCatalogsLoaded();
  };

  const addBillableItem = (item: Product | Service, type: 'product' | 'service') => {
    const newItem: BillableItem = {
      type,
      id: item.id,
      name: item.name,
      quantity: 1,
      unit_price: item.price,
      notes: ''
    };

    setFormData({
      ...formData,
      billable_items: [...formData.billable_items, newItem]
    });
    setShowItemSelector(false);
    setItemSearchTerm('');
  };

  const removeBillableItem = (index: number) => {
    setFormData({
      ...formData,
      billable_items: formData.billable_items.filter((_, i) => i !== index)
    });
  };

  const updateBillableItemQuantity = (index: number, quantity: number) => {
    const items = [...formData.billable_items];
    items[index].quantity = quantity;
    setFormData({ ...formData, billable_items: items });
  };

  const addPrescription = (medication: Medication) => {
    const newPrescription: PrescriptionItem = {
      medication_id: medication.id,
      medication_name: medication.name,
      dosage: '',
      frequency: 'Cada 12 horas',
      duration_days: 7,
      quantity: '1',
      route: 'oral',
      instructions: ''
    };

    setFormData({
      ...formData,
      prescriptions: [...formData.prescriptions, newPrescription]
    });
    setShowPrescriptionModal(false);
  };

  const removePrescription = (index: number) => {
    setFormData({
      ...formData,
      prescriptions: formData.prescriptions.filter((_, i) => i !== index)
    });
  };

  const addDiagnosis = (diagnosis: Diagnosis) => {
    const newDiagnosis: DiagnosisItem = {
      diagnosis_id: diagnosis.id,
      diagnosis_name: diagnosis.name,
      notes: '',
      is_primary: formData.diagnoses.length === 0
    };

    setFormData({
      ...formData,
      diagnoses: [...formData.diagnoses, newDiagnosis]
    });
    setShowDiagnosisModal(false);
  };

  const removeDiagnosis = (index: number) => {
    setFormData({
      ...formData,
      diagnoses: formData.diagnoses.filter((_, i) => i !== index)
    });
  };

  const addTreatment = (treatment: Treatment) => {
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (treatment.duration_days || 7));

    const newTreatment: TreatmentItem = {
      treatment_id: treatment.id,
      treatment_name: treatment.name,
      instructions: treatment.protocol || '',
      start_date: today,
      end_date: endDate.toISOString().split('T')[0]
    };

    const newBillableItem: BillableItem = {
      type: 'service',
      id: treatment.id,
      name: `Tratamiento: ${treatment.name}`,
      quantity: 1,
      unit_price: treatment.price || 0,
      notes: 'Agregado automaticamente'
    };

    const updatedBillableItems = treatment.price && treatment.price > 0
      ? [...formData.billable_items, newBillableItem]
      : formData.billable_items;

    setFormData({
      ...formData,
      treatments: [...formData.treatments, newTreatment],
      billable_items: updatedBillableItems
    });
    setShowTreatmentModal(false);
  };

  const addVaccine = (vaccine: VaccineCatalog) => {
    const selectedPet = pets.find(p => p.id === formData.pet_id);
    const petSpecies = selectedPet?.species?.toLowerCase() || '';
    const normalizedPetSpeciesForValidation = normalizeSpecies(petSpecies);

    if (vaccine.species && vaccine.species.length > 0) {
      const speciesMatch = vaccine.species.some(s =>
        normalizedPetSpeciesForValidation.includes(s.toLowerCase())
      );
      if (!speciesMatch && petSpecies) {
        showError(`Esta vacuna no es aplicable para ${selectedPet?.species}`);
        return;
      }
    }

    const nextDoseDate = new Date();
    nextDoseDate.setDate(nextDoseDate.getDate() + (vaccine.interval_days || 365));

    const newVaccine: VaccineItem = {
      vaccine_id: vaccine.id,
      vaccine_name: vaccine.name,
      batch_number: '',
      dose_number: 1,
      next_dose_date: nextDoseDate.toISOString().split('T')[0],
      price: vaccine.price,
      notes: ''
    };

    const newBillableItem: BillableItem = {
      type: 'service',
      id: vaccine.id,
      name: `Vacuna: ${vaccine.name}`,
      quantity: 1,
      unit_price: vaccine.price || 0,
      notes: 'Agregado automaticamente'
    };

    const updatedBillableItems = vaccine.price > 0
      ? [...formData.billable_items, newBillableItem]
      : formData.billable_items;

    setFormData({
      ...formData,
      vaccines: [...formData.vaccines, newVaccine],
      billable_items: updatedBillableItems
    });
    setShowVaccineModal(false);
  };

  const removeVaccine = (index: number) => {
    const vaccineToRemove = formData.vaccines[index];
    const updatedBillableItems = formData.billable_items.filter(
      item => !(item.name === `Vacuna: ${vaccineToRemove.vaccine_name}` && item.id === vaccineToRemove.vaccine_id)
    );

    setFormData({
      ...formData,
      vaccines: formData.vaccines.filter((_, i) => i !== index),
      billable_items: updatedBillableItems
    });
  };

  const removeTreatment = (index: number) => {
    const treatmentToRemove = formData.treatments[index];
    const updatedBillableItems = formData.billable_items.filter(
      item => !(item.name === `Tratamiento: ${treatmentToRemove.treatment_name}` && item.id === treatmentToRemove.treatment_id)
    );

    setFormData({
      ...formData,
      treatments: formData.treatments.filter((_, i) => i !== index),
      billable_items: updatedBillableItems
    });
  };

  const calculateTotal = () => {
    return formData.billable_items.reduce((sum, item) =>
      sum + (item.unit_price * item.quantity), 0
    );
  };

  const handleSaveConsultation = async () => {
    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const totalAmount = calculateTotal();

      const consultationData: any = {
        tenant_id: currentTenant!.id,
        pet_id: formData.pet_id,
        veterinarian_id: userData.user.id,
        appointment_id: formData.appointment_id || null,
        reason: formData.reason,
        symptoms: formData.symptoms || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : null,
        notes: formData.notes || null,
        status: selectedConsultation?.status ?? 'in_progress',
        date: new Date().toISOString(),
        billable_items: formData.billable_items,
        total_amount: totalAmount,
        billed: selectedConsultation?.billed ?? false
      };

      let consultationId: string;

      if (selectedConsultation) {
        const { error } = await supabase
          .from('consultations')
          .update(consultationData)
          .eq('id', selectedConsultation.id);

        if (error) throw error;
        consultationId = selectedConsultation.id;
      } else {
        const { data, error } = await supabase
          .from('consultations')
          .insert([consultationData])
          .select()
          .single();

        if (error) throw error;
        consultationId = data.id;
      }

      if (formData.diagnoses.length > 0) {
        await supabase.from('consultation_diagnoses').delete().eq('consultation_id', consultationId);
        const diagnosesData = formData.diagnoses.map(d => ({
          tenant_id: currentTenant!.id,
          consultation_id: consultationId,
          diagnosis_id: d.diagnosis_id,
          diagnosis_name: d.diagnosis_name,
          notes: d.notes,
          is_primary: d.is_primary
        }));
        await supabase.from('consultation_diagnoses').insert(diagnosesData);
      }

      if (formData.treatments.length > 0) {
        await supabase.from('consultation_treatments').delete().eq('consultation_id', consultationId);
        const treatmentsData = formData.treatments.map(t => ({
          tenant_id: currentTenant!.id,
          consultation_id: consultationId,
          treatment_id: t.treatment_id,
          treatment_name: t.treatment_name,
          instructions: t.instructions,
          start_date: t.start_date,
          end_date: t.end_date
        }));
        await supabase.from('consultation_treatments').insert(treatmentsData);
      }

      if (formData.vaccines.length > 0) {
        await supabase.from('consultation_vaccines').delete().eq('consultation_id', consultationId);
        const vaccinesData = formData.vaccines.map(v => ({
          tenant_id: currentTenant!.id,
          consultation_id: consultationId,
          vaccine_id: v.vaccine_id,
          vaccine_name: v.vaccine_name,
          batch_number: v.batch_number || null,
          expiry_date: v.expiry_date || null,
          dose_number: v.dose_number,
          next_dose_date: v.next_dose_date || null,
          price: v.price,
          notes: v.notes || null
        }));
        await supabase.from('consultation_vaccines').insert(vaccinesData);

        for (const vaccine of formData.vaccines) {
          await supabase.from('pet_health').insert({
            tenant_id: currentTenant!.id,
            pet_id: formData.pet_id,
            user_id: userData.user.id,
            type: 'vaccine',
            name: vaccine.vaccine_name,
            application_date: new Date().toISOString(),
            next_due_date: vaccine.next_dose_date,
            veterinarian: userData.user.email,
            notes: vaccine.notes,
            status: 'applied'
          });
        }
      }

      if (formData.prescriptions.length > 0) {
        await supabase.from('prescriptions').delete().eq('consultation_id', consultationId);
        for (const prescription of formData.prescriptions) {
          await createPrescription(currentTenant!.id, {
            consultation_id: consultationId,
            pet_id: formData.pet_id,
            medication_id: prescription.medication_id,
            medication_name: prescription.medication_name,
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            duration_days: prescription.duration_days,
            quantity: prescription.quantity,
            route: prescription.route,
            instructions: prescription.instructions,
            veterinarian_id: userData.user.id
          });
        }
      }

      if (formData.appointment_id) {
        await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', formData.appointment_id);
      }

      showSuccess('Consulta guardada exitosamente');
      setShowModal(false);
      setSelectedConsultation(null);
      resetForm();
      loadConsultations();
    } catch (error: any) {
      console.error('Error saving consultation:', error);
      showError('Error al guardar la consulta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChargeConsultation = (consultationId: string) => {
    window.location.hash = '#pos?consultation=' + consultationId;
  };

  const resetForm = () => {
    setFormData({
      pet_id: '',
      appointment_id: undefined,
      reason: '',
      symptoms: '',
      weight: '',
      temperature: '',
      heart_rate: '',
      notes: '',
      billable_items: [],
      vaccines: [],
      diagnoses: [],
      treatments: [],
      prescriptions: []
    });
  };

  const handleNewConsultation = async () => {
    await ensureConsultationFormCatalogs();
    resetForm();
    setSelectedConsultation(null);
    setShowModal(true);
  };

  const handleViewConsultation = async (consultation: Consultation) => {
    try {
      await ensureConsultationFormCatalogs();

      const [consultationResult, diagnosesResult, treatmentsResult, vaccinesResult, prescriptionsResult] = await Promise.all([
        supabase
          .from('consultations')
          .select('*')
          .eq('id', consultation.id)
          .single(),
        supabase
          .from('consultation_diagnoses')
          .select('*')
          .eq('consultation_id', consultation.id),
        supabase
          .from('consultation_treatments')
          .select('*')
          .eq('consultation_id', consultation.id),
        supabase
          .from('consultation_vaccines')
          .select('*')
          .eq('consultation_id', consultation.id),
        supabase
          .from('prescriptions')
          .select('*')
          .eq('consultation_id', consultation.id),
      ]);

      const { data, error } = consultationResult;
      const { data: diagnosesData, error: diagnosesError } = diagnosesResult;
      const { data: treatmentsData, error: treatmentsError } = treatmentsResult;
      const { data: vaccinesData, error: vaccinesError } = vaccinesResult;
      const { data: prescriptionsData, error: prescriptionsError } = prescriptionsResult;

      if (error) throw error;
      if (diagnosesError) throw diagnosesError;
      if (treatmentsError) throw treatmentsError;
      if (vaccinesError) throw vaccinesError;
      if (prescriptionsError) throw prescriptionsError;

      setFormData({
        pet_id: data.pet_id,
        appointment_id: data.appointment_id,
        reason: data.reason || '',
        symptoms: data.symptoms || '',
        weight: data.weight?.toString() || '',
        temperature: data.temperature?.toString() || '',
        heart_rate: data.heart_rate?.toString() || '',
        notes: data.notes || '',
        billable_items: data.billable_items || [],
        diagnoses: diagnosesData?.map(d => ({
          diagnosis_id: d.diagnosis_id,
          diagnosis_name: d.diagnosis_name,
          notes: d.notes,
          is_primary: d.is_primary
        })) || [],
        vaccines: vaccinesData?.map(v => ({
          vaccine_id: v.vaccine_id,
          vaccine_name: v.vaccine_name,
          batch_number: v.batch_number,
          expiry_date: v.expiry_date,
          dose_number: v.dose_number,
          next_dose_date: v.next_dose_date,
          price: v.price,
          notes: v.notes
        })) || [],
        treatments: treatmentsData?.map(t => ({
          treatment_id: t.treatment_id,
          treatment_name: t.treatment_name,
          instructions: t.instructions,
          start_date: t.start_date,
          end_date: t.end_date
        })) || [],
        prescriptions: prescriptionsData?.map(p => ({
          medication_id: p.medication_id,
          medication_name: p.medication_name,
          dosage: p.dosage,
          frequency: p.frequency,
          duration_days: p.duration_days,
          quantity: p.quantity,
          route: p.route,
          instructions: p.instructions
        })) || []
      });

      setSelectedConsultation(consultation);
      setShowModal(true);
    } catch (error) {
      console.error('Error loading consultation:', error);
      showError('Error al cargar la consulta');
    }
  };

  const filteredConsultations = consultations.filter(c => {
    const matchesSearch = c.pet_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
  );

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
  );

  const filteredMedications = medications.filter(m =>
    m.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
  );

  const filteredDiagnoses = diagnoses.filter(d =>
    d.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
  );

  const filteredTreatments = treatments.filter(t =>
    t.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
  );

  const speciesMapping: Record<string, string[]> = {
    'perro': ['perro', 'dog', 'canino', 'can'],
    'gato': ['gato', 'cat', 'felino'],
    'ave': ['ave', 'bird', 'pajaro'],
    'roedor': ['roedor', 'rodent', 'hamster', 'conejo', 'rabbit'],
    'reptil': ['reptil', 'reptile', 'tortuga', 'iguana']
  };

  const normalizeSpecies = (species: string): string[] => {
    const lower = species.toLowerCase();
    for (const [normalized, variants] of Object.entries(speciesMapping)) {
      if (variants.includes(lower)) {
        return [normalized, ...variants];
      }
    }
    return [lower];
  };

  const selectedPetSpecies = pets.find(p => p.id === formData.pet_id)?.species?.toLowerCase() || '';
  const normalizedPetSpecies = normalizeSpecies(selectedPetSpecies);

  const filteredVaccines = vaccineCatalog.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(itemSearchTerm.toLowerCase());
    const matchesSpecies = !selectedPetSpecies || !v.species || v.species.length === 0 ||
      v.species.some(s => normalizedPetSpecies.includes(s.toLowerCase()));
    return matchesSearch && matchesSpecies;
  });

  const columns = [
    { key: 'date', label: 'Fecha', render: (_value: string, row: Consultation) => new Date(row.date).toLocaleDateString('es-ES') },
    { key: 'pet_name', label: 'Mascota' },
    { key: 'pet_species', label: 'Especie' },
    { key: 'owner_name', label: 'Dueño' },
    { key: 'reason', label: 'Motivo' },
    {
      key: 'status',
      label: 'Estado',
      render: (_value: string, row: Consultation) => (
        <Badge variant={
          row.status === 'completed' ? 'success' :
          row.status === 'in_progress' ? 'warning' :
          'default'
        }>
          {row.status === 'completed' ? 'Completada' :
           row.status === 'in_progress' ? 'En Progreso' :
           row.status}
        </Badge>
      )
    },
    {
      key: 'billing',
      label: 'Facturación',
      render: (_value: unknown, row: Consultation) => (
        <div className="flex items-center gap-2">
          {row.total_amount > 0 && (
            <Badge variant={row.billed ? 'success' : 'warning'}>
              ${row.total_amount.toFixed(2)}
            </Badge>
          )}
          {!row.billed && row.total_amount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleChargeConsultation(row.id);
              }}
              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 flex items-center gap-1"
            >
              <ShoppingCart className="w-3 h-3" />
              Cobrar
            </button>
          )}
        </div>
      )
    },
    { key: 'veterinarian_name', label: 'Veterinario' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 shadow-sm shadow-teal-100">
              <Activity className="w-6 h-6" />
            </span>
            Expediente Médico & Consultas
          </h1>
          <p className="mt-2 text-sm text-slate-600">Gestión clínica, diagnósticos y cobro de consultas en una vista unificada.</p>
        </div>
        <button
          onClick={() => void handleNewConsultation()}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition hover:from-teal-700 hover:to-emerald-700"
        >
          <Plus className="w-5 h-5" />
          Nueva Consulta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-6 shadow-sm shadow-teal-100/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Consultas Hoy</p>
              <p className="text-3xl font-bold text-slate-900">
                {consultations.filter(c => new Date(c.date).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-sm shadow-emerald-100/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Completadas</p>
              <p className="text-3xl font-bold text-slate-900">
                {consultations.filter(c => c.status === 'completed').length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm shadow-amber-100/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pendientes Cobro</p>
              <p className="text-3xl font-bold text-slate-900">
                {consultations.filter(c => !c.billed && c.total_amount > 0).length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-teal-50 p-6 shadow-sm shadow-sky-100/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Mes</p>
              <p className="text-3xl font-bold text-slate-900">
                {consultations.filter(c => new Date(c.date).getMonth() === new Date().getMonth()).length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Heart className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className={`${panelClassName} p-4`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por mascota, dueño o motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${subtleInputClassName} pl-10`}
            />
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
            <Filter className="w-5 h-5 text-teal-600" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-w-[210px] bg-transparent text-sm font-medium text-slate-700 outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      <div className={`${panelClassName} overflow-hidden`}>
        <Table
          columns={columns}
          data={filteredConsultations}
          loading={loading}
          onRowClick={handleViewConsultation}
        />
      </div>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={selectedConsultation ? 'Ver/Editar Consulta' : 'Nueva Consulta Veterinaria'}
          size="xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <FormField label="Mascota" required>
              <select
                value={formData.pet_id}
                onChange={(e) => setFormData({ ...formData, pet_id: e.target.value })}
                className={subtleInputClassName}
                required
                disabled={!!selectedConsultation}
              >
                <option value="">Seleccionar mascota...</option>
                {pets.map(pet => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species}) - {pet.owner_name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Motivo de Consulta" required>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Ej: Chequeo anual, vacunación, malestar..."
                required
              />
            </FormField>

            <FormField label="Síntomas Observados">
              <Textarea
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                placeholder="Describe los síntomas observados..."
                rows={2}
              />
            </FormField>

            <div className="grid grid-cols-3 gap-4">
              <FormField label="Peso (kg)">
                <div className="relative">
                  <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="0.0"
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField label="Temperatura (°C)">
                <div className="relative">
                  <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    placeholder="0.0"
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField label="Frecuencia Cardíaca">
                <div className="relative">
                  <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="number"
                    value={formData.heart_rate}
                    onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                    placeholder="BPM"
                    className="pl-10"
                  />
                </div>
              </FormField>
            </div>

            <div className={softSectionClassName}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-600" />
                  Diagnósticos
                </h3>
                <button
                  onClick={() => setShowDiagnosisModal(true)}
                  className={accentButtonClassName}
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>

              {formData.diagnoses.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No hay diagnósticos agregados
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.diagnoses.map((diag, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {diag.is_primary && <Badge variant="success">Primario</Badge>}
                          <span className="text-sm font-medium text-slate-900">{diag.diagnosis_name}</span>
                        </div>
                        {diag.notes && <p className="text-xs text-slate-500 mt-1">{diag.notes}</p>}
                      </div>
                      <button
                        onClick={() => removeDiagnosis(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={softSectionClassName}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-teal-600" />
                  Tratamientos
                </h3>
                <button
                  onClick={() => setShowTreatmentModal(true)}
                  className={accentButtonClassName}
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>

              {formData.treatments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No hay tratamientos agregados
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.treatments.map((treatment, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-900">{treatment.treatment_name}</span>
                        {treatment.instructions && <p className="text-xs text-slate-500 mt-1">{treatment.instructions}</p>}
                      </div>
                      <button
                        onClick={() => removeTreatment(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={softSectionClassName}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-teal-600" />
                  Vacunacion
                </h3>
                <button
                  onClick={() => {
                    if (!formData.pet_id) {
                      showError('Selecciona una mascota primero');
                      return;
                    }
                    setShowVaccineModal(true);
                  }}
                  className={accentButtonClassName}
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>

              {formData.vaccines.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No hay vacunas aplicadas
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.vaccines.map((vaccine, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Syringe className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-slate-900">{vaccine.vaccine_name}</span>
                          <Badge variant="success">Dosis {vaccine.dose_number}</Badge>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-slate-500">
                          {vaccine.batch_number && <span>Lote: {vaccine.batch_number}</span>}
                          {vaccine.next_dose_date && <span>Proxima: {new Date(vaccine.next_dose_date).toLocaleDateString('es-ES')}</span>}
                          {vaccine.price > 0 && <span className="text-green-600 font-medium">${vaccine.price.toFixed(2)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => removeVaccine(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={softSectionClassName}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-teal-600" />
                  Prescripciones
                </h3>
                <button
                  onClick={() => setShowPrescriptionModal(true)}
                  className={accentButtonClassName}
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>

              {formData.prescriptions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No hay prescripciones agregadas
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.prescriptions.map((prescription, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-900">{prescription.medication_name}</span>
                        <p className="text-xs text-slate-500">
                          {prescription.dosage} - {prescription.frequency} - {prescription.duration_days} días
                        </p>
                      </div>
                      <button
                        onClick={() => removePrescription(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={softSectionClassName}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-teal-600" />
                  Items a Cobrar
                </h3>
                <button
                  onClick={() => setShowItemSelector(true)}
                  className={accentButtonClassName}
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>

              {formData.billable_items.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No hay items agregados
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.billable_items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.type === 'product' ? 'default' : 'info'}>
                            {item.type === 'product' ? 'Producto' : 'Servicio'}
                          </Badge>
                          <span className="text-sm font-medium text-slate-900">{item.name}</span>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateBillableItemQuantity(index, parseInt(e.target.value))}
                        className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-700 outline-none focus:border-teal-500"
                      />
                      <span className="w-20 text-right text-sm font-medium text-slate-600">
                        ${(item.unit_price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeBillableItem(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-900">Total a Cobrar:</span>
                    <span className="text-lg font-bold text-teal-700">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <FormField label="Notas Adicionales">
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observaciones adicionales..."
                rows={2}
              />
            </FormField>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <X className="w-4 h-4 inline mr-2" />
                Cancelar
              </button>
              <button
                onClick={handleSaveConsultation}
                disabled={loading || !formData.pet_id || !formData.reason}
                className="flex-1 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-teal-700 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="w-4 h-4 inline mr-2" />
                {selectedConsultation ? 'Actualizar' : 'Guardar'} Consulta
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showItemSelector && (
        <Modal
          isOpen={showItemSelector}
          onClose={() => {setShowItemSelector(false); setItemSearchTerm('');}}
          title="Agregar Item a Cobrar"
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setItemType('product')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  itemType === 'product'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Productos
              </button>
              <button
                onClick={() => setItemType('service')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  itemType === 'service'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Servicios
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                className={`${subtleInputClassName} pl-10`}
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {itemType === 'product' ? (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addBillableItem(product, 'product')}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/50"
                    disabled={product.stock === 0}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-sm text-slate-500">Stock: {product.stock}</p>
                      </div>
                      <span className="text-lg font-bold text-teal-700">${product.price}</span>
                    </div>
                  </button>
                ))
              ) : (
                filteredServices.map(service => (
                  <button
                    key={service.id}
                    onClick={() => addBillableItem(service, 'service')}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/50"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-slate-900">{service.name}</p>
                      <span className="text-lg font-bold text-teal-700">${service.price}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {showPrescriptionModal && (
        <Modal
          isOpen={showPrescriptionModal}
          onClose={() => {setShowPrescriptionModal(false); setItemSearchTerm('');}}
          title="Agregar Prescripción"
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar medicamento..."
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                className={`${subtleInputClassName} pl-10`}
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredMedications.map(medication => (
                <button
                  key={medication.id}
                  onClick={() => addPrescription(medication)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{medication.name}</p>
                    {medication.generic_name && (
                      <p className="text-sm text-slate-500">{medication.generic_name}</p>
                    )}
                    <Badge variant="info" className="mt-1">{medication.category}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showDiagnosisModal && (
        <Modal
          isOpen={showDiagnosisModal}
          onClose={() => {setShowDiagnosisModal(false); setItemSearchTerm('');}}
          title="Agregar Diagnóstico"
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar diagnóstico..."
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                className={`${subtleInputClassName} pl-10`}
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredDiagnoses.map(diagnosis => (
                <button
                  key={diagnosis.id}
                  onClick={() => addDiagnosis(diagnosis)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {diagnosis.code && (
                        <Badge variant="default">{diagnosis.code}</Badge>
                      )}
                      <p className="font-medium text-slate-900">{diagnosis.name}</p>
                    </div>
                    {diagnosis.description && (
                      <p className="text-sm text-slate-500 mt-1">{diagnosis.description}</p>
                    )}
                    <Badge variant="info" className="mt-1">{diagnosis.category}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showTreatmentModal && (
        <Modal
          isOpen={showTreatmentModal}
          onClose={() => {setShowTreatmentModal(false); setItemSearchTerm('');}}
          title="Agregar Tratamiento"
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar tratamiento..."
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                className={`${subtleInputClassName} pl-10`}
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredTreatments.map(treatment => (
                <button
                  key={treatment.id}
                  onClick={() => addTreatment(treatment)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{treatment.name}</p>
                    {treatment.description && (
                      <p className="text-sm text-slate-500 mt-1">{treatment.description}</p>
                    )}
                    {treatment.duration_days && (
                      <p className="text-xs text-slate-400 mt-1">Duracion: {treatment.duration_days} dias</p>
                    )}
                    <Badge variant="info" className="mt-1">{treatment.category}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showVaccineModal && (
        <Modal
          isOpen={showVaccineModal}
          onClose={() => {setShowVaccineModal(false); setItemSearchTerm('');}}
          title="Aplicar Vacuna"
        >
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Vacunas para: {pets.find(p => p.id === formData.pet_id)?.name || 'Mascota'}
                  </p>
                  <p className="text-xs text-green-700">
                    Especie: {pets.find(p => p.id === formData.pet_id)?.species || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar vacuna..."
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                className={`${subtleInputClassName} pl-10`}
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredVaccines.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No hay vacunas disponibles para esta especie
                </p>
              ) : (
                filteredVaccines.map(vaccine => (
                  <button
                    key={vaccine.id}
                    onClick={() => addVaccine(vaccine)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-green-300 hover:bg-green-50/50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{vaccine.name}</p>
                          {vaccine.is_required && (
                            <Badge variant="warning">Obligatoria</Badge>
                          )}
                        </div>
                        {vaccine.description && (
                          <p className="text-sm text-slate-500 mt-1">{vaccine.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {vaccine.manufacturer && (
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{vaccine.manufacturer}</span>
                          )}
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {vaccine.required_doses} dosis
                          </span>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                            Refuerzo: {vaccine.interval_days} dias
                          </span>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-green-700">${vaccine.price.toFixed(2)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
