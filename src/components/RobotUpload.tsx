import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  X, 
  Plus, 
  Package, 
  Bot,
  Camera,
  Link,
  AlertCircle,
  CheckCircle,
  Star,
  Zap,
  Shield,
  Calendar,
  MapPin,
  DollarSign,
  Settings,
  Award,
  Activity,
  ExternalLink,
  FileText,
  Target,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, type Currency, CURRENCY_SYMBOLS, convertToINR } from "@/utils/currency";
import { generateAllSEOElements, type RobotSEOData } from "@/utils/seo";

interface CustomField {
  field_name: string;
  field_value: string;
}

interface RobotFormData {
  name: string;
  brand: string;
  model: string;
  robot_type: string;
  quantity: number;
  location: string;
  state: string;
  pincode: string;
  price: number | null;
  currency: Currency;
  description: string;
  technical_specifications: Record<string, any>;
  category_tags: string[];
  condition: string;
  year_manufactured: number;
  payload_capacity: number | null;
  reach: number | null;
  repeatability: number | null;
  power_consumption: number | null;
  operating_environment: string;
  warranty_info: string;
  certification_standards: string[];
  applications: string[];
  included_accessories: string[];
  training_included: boolean;
  installation_service: boolean;
  maintenance_contract: boolean;
  financing_available: boolean;
  controller_type: string;
  brochure_url: string | null;
  video_url: string | null;
  video_type: string;
}

interface RobotUploadProps {
  onSuccess?: () => void;
  editMode?: boolean;
  robotData?: any;
}

const RobotUpload = ({ onSuccess, editMode = false, robotData }: RobotUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [validatingImages, setValidatingImages] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newApplication, setNewApplication] = useState('');
  const [newAccessory, setNewAccessory] = useState('');
  const [formCompletion, setFormCompletion] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  
  // File upload state
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoType, setVideoType] = useState<'upload' | 'youtube'>('upload');
  
  const [formData, setFormData] = useState<RobotFormData>(() => {
    if (editMode && robotData) {
      return {
        name: robotData.name || '',
        brand: robotData.brand || '',
        model: robotData.model || '',
        robot_type: robotData.robot_type || '',
        quantity: robotData.quantity || 1,
        location: robotData.location || '',
        state: robotData.state || '',
        pincode: robotData.pincode || '',
        price: robotData.price || null,
        currency: robotData.currency || 'INR',
        description: robotData.description || '',
        technical_specifications: robotData.technical_specifications || {},
        category_tags: robotData.category_tags || [],
        condition: robotData.condition || 'new',
        year_manufactured: robotData.year_manufactured || new Date().getFullYear(),
        payload_capacity: robotData.payload_capacity || null,
        reach: robotData.reach || null,
        repeatability: robotData.repeatability || null,
        power_consumption: robotData.power_consumption || null,
        operating_environment: robotData.operating_environment || '',
        warranty_info: robotData.warranty_info || '',
        certification_standards: robotData.certification_standards || [],
        applications: robotData.applications || [],
        included_accessories: robotData.included_accessories || [],
        training_included: robotData.training_included || false,
        installation_service: robotData.installation_service || false,
        maintenance_contract: robotData.maintenance_contract || false,
        financing_available: robotData.financing_available || false,
        controller_type: robotData.controller_type || '',
        brochure_url: robotData.brochure_url || null,
        video_url: robotData.video_url || null,
        video_type: robotData.video_type || 'upload',
      };
    }
    return {
      name: '',
      brand: '',
      model: '',
      robot_type: '',
      quantity: 1,
      location: '',
      state: '',
      pincode: '',
      price: null,
      currency: 'INR',
      description: '',
      technical_specifications: {},
      category_tags: [],
      condition: 'new',
      year_manufactured: new Date().getFullYear(),
      payload_capacity: null,
      reach: null,
      repeatability: null,
      power_consumption: null,
      operating_environment: '',
      warranty_info: '',
      certification_standards: [],
      applications: [],
      included_accessories: [],
      training_included: false,
      installation_service: false,
      maintenance_contract: false,
      financing_available: false,
      controller_type: '',
      brochure_url: null,
      video_url: null,
      video_type: 'upload',
    };
  });

  const robotTypes = [
    'Industrial Robot',
    'Collaborative Robot (Cobot)',
    'Articulated Robot',
    'SCARA Robot',
    'Delta Robot',
    'Cartesian Robot',
    'Gantry Robot',
    'Linear Robot',
    'Cylindrical Robot',
    'Spherical Robot',
    'Polar Robot',
    'Parallel Robot',
    'Humanoid Robot',
    'Mobile Robot',
    'AMR (Autonomous Mobile Robot)',
    'AGV (Automated Guided Vehicle)',
    'Welding Robot',
    'Painting Robot',
    'Assembly Robot',
    'Pick and Place Robot',
    'Packaging Robot',
    'Palletizing Robot',
    'Material Handling Robot',
    'Machine Tending Robot',
    'Inspection Robot',
    'CNC Robot',
    '7th Axis Linear Track Robot',
    'Vision-Guided Robot',
    'Force-Controlled Robot',
    'Service Robot',
    'Medical Robot',
    'Other'
];

  const robotBrands = [
    // Major Global Brands
    'ABB', 'KUKA', 'Fanuc', 'Yaskawa', 'Kawasaki', 'Mitsubishi', 'Denso', 
    'Epson', 'Universal Robots', 'Staubli', 'Comau', 'Nachi', 'Omron',
    'Doosan', 'Techman Robot', 'Precise Automation',
    
    // Additional Major Brands
    'Motoman', 'Adept', 'Reis Robotics', 'Cloos', 'Panasonic', 'Toshiba',
    'Hitachi', 'Yamaha', 'IAI', 'THK', 'Hiwin', 'Googol Technology',
    
    // Collaborative Robot Specialists
    'Franka Emika', 'Rethink Robotics', 'Cobots', 'Elephant Robotics',
    'Kassow Robots', 'Hanwha', 'Rainbow Robotics', 'Aubo Robotics',
    
    // Indian/Regional Brands
    'Tata Technologies', 'Hi-Tech Robotics', 'Automech Robotics',
    'Pari Robotics', 'TAL Manufacturing', 'Grind Master',
    
    // Chinese Brands
    'Siasun', 'ESTUN', 'GSK CNC', 'Effort', 'EFORT', 'Han\'s Robot',
    'Rokae', 'Elite Robot', 'Jaka Robotics', 'Dobot',
    
    'Other'
];

  const conditionOptions = [
  { value: 'new', label: 'Brand New', description: 'Factory sealed, never used' },
  { value: 'like_new', label: 'Like New', description: 'Barely used, excellent condition' },
  { value: 'good', label: 'Good', description: 'Well maintained, minor wear' },
  { value: 'used', label: 'Used', description: 'Previously owned and operated' },  // changed this entry
  { value: 'refurbished', label: 'Refurbished', description: 'Professionally restored' }
];

  const operatingEnvironments = [
    'Standard Industrial',
    'Clean Room (ISO Class 5-8)',
    'Harsh Environment',
    'Explosive Atmosphere (ATEX/IECEx)',
    'High Temperature (up to 200°C)',
    'Low Temperature (-40°C to 0°C)',
    'Outdoor/Weather Resistant',
    'Food Grade/FDA Compliant',
    'Pharmaceutical Grade',
    'Automotive Manufacturing',
    'Electronics Assembly',
    'Chemical Processing',
    'Foundry/Casting',
    'Aerospace Manufacturing',
    'Laboratory Environment',
    'Underwater/Marine',
    'Radiation Environment',
    'Dusty Environment (IP65/IP67)',
    'Corrosive Environment',
    'Vibration Resistant'
];

  const commonApplications = [
    // Manufacturing Operations
    'Welding (Arc, Spot, Laser)',
    'Assembly (Automated)',
    'Pick and Place',
    'Packaging',
    'Palletizing',
    'Material Handling',
    'Machine Tending',
    'Quality Inspection',
    'Painting/Coating',
    'Cutting (Laser, Water Jet, Plasma)',
    'Grinding',
    'Polishing',
    'Dispensing (Adhesive, Sealant)',
    'Testing/Measurement',
    
    // Specialized Operations
    'Deburring',
    'Drilling',
    'Milling',
    'Surface Treatment',
    'Loading/Unloading',
    'Sorting',
    'Labeling',
    'Fastening',
    'Riveting',
    'Soldering',
    'Injection Molding',
    'Press Operations',
    'Die Casting',
    'Forging',
    'Heat Treatment',
    
    // Service Applications
    'Cleaning',
    'Maintenance',
    'Security/Surveillance',
    'Education/Research',
    'Medical Assistance',
    'Rehabilitation Therapy'
];

  const certificationStandards = [
    // International Standards
    'ISO 9001 (Quality Management)',
    'ISO 10218 (Robot Safety)',
    'ISO 13849 (Safety Control Systems)',
    'IEC 61508 (Functional Safety)',
    'IEC 62061 (Safety Control Systems)',
    'CE Marking (European Conformity)',
    
    // Regional Standards
    'ANSI/RIA R15.06 (US Robot Safety)',
    'NRTL Listed (US)',
    'UL Listed (US)',
    'CSA Certified (Canada)',
    'JIS Standards (Japan)',
    'GB Standards (China)',
    'BIS (Bureau of Indian Standards)',
    
    // Industry-Specific
    'FDA 21 CFR Part 11 (Pharmaceutical)',
    'HACCP (Food Safety)',
    'SIL Rated (Safety Integrity Level)',
    'ATEX Certified (Explosive Atmospheres)',
    'IECEx Certified (Explosive Atmospheres)',
    'IP Rating (Ingress Protection)',
    'EMC Compliance',
    'FCC Certified',
    'RoHS Compliant',
    'REACH Compliant',
    
    // Collaborative Robot Specific
    'ISO/TS 15066 (Collaborative Robots)',
    'EN ISO 13849 (Safety Functions)',
    'OSHA Compliant',
    'None/Not Specified'
];

  useEffect(() => {
    calculateFormCompletion();
  }, [formData, images, imageUrls]);

  const calculateFormCompletion = () => {
    const requiredFields = ['name', 'robot_type', 'description', 'price'];
    const optionalFields = [
      'brand', 'model', 'location', 'condition', 'warranty_info', 
      'category_tags', 'applications', 'payload_capacity'
    ];

    const requiredCompleted = requiredFields.filter(field => {
      const value = formData[field as keyof RobotFormData];
      return value && value !== '' && value !== null;
    }).length;

    const optionalCompleted = optionalFields.filter(field => {
      const value = formData[field as keyof RobotFormData];
      if (Array.isArray(value)) return value.length > 0;
      return value && value !== '' && value !== null;
    }).length;

    const imageScore = images.length > 0 || imageUrls.some(url => url.trim()) ? 1 : 0;

    const completion = Math.round(
      ((requiredCompleted / requiredFields.length) * 60) + 
      ((optionalCompleted / optionalFields.length) * 30) +
      (imageScore * 10)
    );
    
    setFormCompletion(completion);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Robot name is required';
    }
    
    if (!formData.robot_type) {
      newErrors.robot_type = 'Robot type is required';
    }
    
    if (!formData.description.trim() || formData.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }
    
    if (!formData.price) {
      newErrors.price = 'Price is required';
    }

    if (!editMode && images.length === 0 && !imageUrls.some(url => url.trim())) {
      newErrors.images = 'At least one image is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof RobotFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 10) {
      toast({
        variant: "destructive",
        title: "Too many images",
        description: "Maximum 10 images allowed"
      });
      return;
    }

    setImages(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setImagePreviewUrls(prev => [...prev, url]);
    });
  };

  const removeImage = (index: number, isFile: boolean = true) => {
    if (isFile) {
      setImages(prev => prev.filter((_, i) => i !== index));
      setImagePreviewUrls(prev => {
        if (prev[index]) URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
      });
    } else {
      const newUrls = imageUrls.filter((_, i) => i !== index);
      setImageUrls(newUrls);
    }
  };

  const validateImageUrl = async (url: string): Promise<boolean> => {
    if (!url || !url.startsWith('http')) return false;
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      return response.ok && contentType?.startsWith('image/');
    } catch {
      return false;
    }
  };

  const handleImageUrlChange = async (index: number, url: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = url;
    setImageUrls(newUrls);

    if (url && url.startsWith('http')) {
      setValidatingImages(true);
      const isValid = await validateImageUrl(url);
      setValidatingImages(false);

      if (!isValid && url.length > 10) {
        toast({
          variant: "destructive",
          title: "Invalid Image URL",
          description: "Please provide a valid image URL"
        });
      }
    }
  };

  const addImageUrlField = () => {
    if (imageUrls.length < 10) {
      setImageUrls([...imageUrls, '']);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.category_tags.includes(newTag.trim())) {
      handleInputChange('category_tags', [...formData.category_tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('category_tags', formData.category_tags.filter(tag => tag !== tagToRemove));
  };

  const addCertification = () => {
    if (newCertification && !formData.certification_standards.includes(newCertification)) {
      handleInputChange('certification_standards', [...formData.certification_standards, newCertification]);
      setNewCertification('');
    }
  };

  const removeCertification = (certToRemove: string) => {
    handleInputChange('certification_standards', formData.certification_standards.filter(cert => cert !== certToRemove));
  };

  const addApplication = () => {
    if (newApplication && !formData.applications.includes(newApplication)) {
      handleInputChange('applications', [...formData.applications, newApplication]);
      setNewApplication('');
    }
  };

  const removeApplication = (appToRemove: string) => {
    handleInputChange('applications', formData.applications.filter(app => app !== appToRemove));
  };

  const addAccessory = () => {
    if (newAccessory.trim() && !formData.included_accessories.includes(newAccessory.trim())) {
      handleInputChange('included_accessories', [...formData.included_accessories, newAccessory.trim()]);
      setNewAccessory('');
    }
  };

  const removeAccessory = (accessoryToRemove: string) => {
    handleInputChange('included_accessories', formData.included_accessories.filter(acc => acc !== accessoryToRemove));
  };

  // Custom fields functions
  const addCustomField = () => {
    if (newFieldName.trim() && newFieldValue.trim()) {
      const newField: CustomField = {
        field_name: newFieldName.trim(),
        field_value: newFieldValue.trim(),
      };
      setCustomFields(prev => [...prev, newField]);
      setNewFieldName('');
      setNewFieldValue('');
    }
  };

  const removeCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  // File upload functions
  const handleBrochureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload a PDF file"
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload a file smaller than 10MB"
        });
        return;
      }
      setBrochureFile(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload a video file"
        });
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload a video smaller than 100MB"
        });
        return;
      }
      setVideoFile(file);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('robot-documents')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('robot-documents')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const image of images) {
      const fileExt = image.name.split('.').pop();
      const fileName = `robots/${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('robot-images')
        .upload(fileName, image);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('robot-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to upload robots"
      });
      return;
    }

    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the errors before submitting"
      });
      return;
    }

    setLoading(true);

    try {
      // Upload new images if any
      const uploadedImageUrls = images.length > 0 ? await uploadImages() : [];
      
      // Combine uploaded images with URL images
      const validImageUrls = imageUrls.filter(url => url && url.startsWith('http'));
      const allImageUrls = [...uploadedImageUrls, ...validImageUrls];

      // Upload brochure and video files
      let brochureUrl = formData.brochure_url;
      let videoUrl = formData.video_url;
      let finalVideoType = formData.video_type;

      if (brochureFile) {
        brochureUrl = await uploadFile(brochureFile, 'brochures');
      }

      if (videoType === 'upload' && videoFile) {
        videoUrl = await uploadFile(videoFile, 'videos');
        finalVideoType = 'upload';
      } else if (videoType === 'youtube' && youtubeUrl) {
        videoUrl = youtubeUrl;
        finalVideoType = 'youtube';
      }
      
      if (editMode && robotData) {
        // Update existing robot listing
        const updateData: any = {
          name: formData.name,
          brand: formData.brand,
          model: formData.model,
          robot_type: formData.robot_type,
          quantity: formData.quantity,
          location: formData.location,
          state: formData.state,
          pincode: formData.pincode,
          price: formData.price,
          currency: formData.currency,
          description: formData.description,
          technical_specifications: formData.technical_specifications,
          category_tags: formData.category_tags,
          condition: formData.condition,
          year_manufactured: formData.year_manufactured,
          payload_capacity: formData.payload_capacity,
          reach: formData.reach,
          repeatability: formData.repeatability,
          power_consumption: formData.power_consumption,
          operating_environment: formData.operating_environment,
          warranty_info: formData.warranty_info,
          certification_standards: formData.certification_standards,
          applications: formData.applications,
          included_accessories: formData.included_accessories,
          training_included: formData.training_included,
          installation_service: formData.installation_service,
          maintenance_contract: formData.maintenance_contract,
          financing_available: formData.financing_available,
          controller_type: formData.controller_type,
          brochure_url: brochureUrl,
          video_url: videoUrl,
          video_type: finalVideoType,
          updated_at: new Date().toISOString()
        };

        // Only update images if new ones were uploaded or URLs provided
        if (allImageUrls.length > 0) {
          updateData.images = allImageUrls;
        }

        console.log('Updating robot with data:', updateData);
        console.log('Robot ID:', robotData.id);

        const { data, error } = await supabase
          .from('robots')
          .update(updateData)
          .eq('id', robotData.id)
          .select();

        if (error) {
          console.error('Robot update error details:', error);
          throw error;
        }

        console.log('Robot update successful:', data);
        
        // Handle custom fields for existing robot
        const robotId = robotData.id;
        
        // Delete existing custom fields
        await supabase
          .from('robot_custom_fields')
          .delete()
          .eq('robot_id', robotId);

        // Insert new custom fields
        if (customFields.length > 0) {
          const { error: customFieldsError } = await supabase
            .from('robot_custom_fields')
            .insert(
              customFields.map(field => ({
                robot_id: robotId,
                field_name: field.field_name,
                field_value: field.field_value,
              }))
            );

          if (customFieldsError) throw customFieldsError;
        }
        
        toast({
          title: "Success!",
          description: "Robot listing updated successfully!"
        });
      } else {
        // Create new robot listing
        const { data: robotData, error } = await supabase
          .from('robots')
          .insert({
            seller_id: user.id,
            name: formData.name,
            brand: formData.brand,
            model: formData.model,
            robot_type: formData.robot_type,
            quantity: formData.quantity,
            location: formData.location,
            state: formData.state,
            pincode: formData.pincode,
            price: formData.price,
            currency: formData.currency,
            description: formData.description,
            technical_specifications: formData.technical_specifications,
            category_tags: formData.category_tags,
            condition: formData.condition,
            year_manufactured: formData.year_manufactured,
            payload_capacity: formData.payload_capacity,
            reach: formData.reach,
            repeatability: formData.repeatability,
            power_consumption: formData.power_consumption,
            operating_environment: formData.operating_environment,
            warranty_info: formData.warranty_info,
            certification_standards: formData.certification_standards,
            applications: formData.applications,
            included_accessories: formData.included_accessories,
            training_included: formData.training_included,
            installation_service: formData.installation_service,
            maintenance_contract: formData.maintenance_contract,
            financing_available: formData.financing_available,
            controller_type: formData.controller_type,
            brochure_url: brochureUrl,
            video_url: videoUrl,
            video_type: finalVideoType,
            images: allImageUrls,
            availability: 'available',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        // Insert custom fields for new robot
        if (customFields.length > 0 && robotData?.id) {
          const { error: customFieldsError } = await supabase
            .from('robot_custom_fields')
            .insert(
              customFields.map(field => ({
                robot_id: robotData.id,
                field_name: field.field_name,
                field_value: field.field_value,
              }))
            );

          if (customFieldsError) throw customFieldsError;
        }

        // Generate SEO elements for the new robot
        if (robotData?.id) {
          try {
            const robotSEOData: RobotSEOData = {
              id: robotData.id,
              brand: formData.brand,
              model: formData.model,
              payload_capacity: formData.payload_capacity,
              controller_type: formData.controller_type,
              year_manufactured: formData.year_manufactured,
              condition: formData.condition,
              reach: formData.reach,
              location: formData.location,
              state: formData.state,
              price: formData.price,
              currency: formData.currency,
              applications: formData.applications,
              images: allImageUrls
            };
            
            const seoElements = generateAllSEOElements(robotSEOData);
            
            // Log SEO elements for verification (remove in production)
            console.log('Generated SEO elements for robot:', seoElements);
          } catch (seoError) {
            console.error('Error generating SEO elements:', seoError);
            // Don't fail the upload if SEO generation fails
          }
        }
        
        toast({
          title: "Success!",
          description: "Robot listing created successfully with SEO optimization!"
        });
      }
      
      // Reset form
      setFormData({
        name: '',
        brand: '',
        model: '',
        robot_type: '',
        quantity: 1,
        location: '',
        state: '',
        pincode: '',
        price: null,
        currency: 'INR',
        description: '',
        technical_specifications: {},
        category_tags: [],
        condition: 'new',
        year_manufactured: new Date().getFullYear(),
        payload_capacity: null,
        reach: null,
        repeatability: null,
        power_consumption: null,
        operating_environment: '',
        warranty_info: '',
        certification_standards: [],
        applications: [],
        included_accessories: [],
        training_included: false,
        installation_service: false,
        maintenance_contract: false,
        financing_available: false,
        controller_type: '',
        brochure_url: null,
        video_url: null,
        video_type: 'upload',
      });
      setImages([]);
      setImageUrls(['']);
      setImagePreviewUrls([]);
      setErrors({});

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Error processing robot listing:', error);
      console.error('Error details:', error?.message, error?.details, error?.hint);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to process robot listing"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompletionColor = (completion: number) => {
    if (completion >= 80) return 'text-success';
    if (completion >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary" />
                {editMode ? 'Edit Robot Listing' : 'Create Professional Robot Listing'}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {editMode ? 'Update your robot listing details' : 'Add your robot to the marketplace and reach thousands of buyers'}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getCompletionColor(formCompletion)}`}>
                {formCompletion}%
              </div>
              <Progress value={formCompletion} className="w-24 mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Complete</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Form Completion Alert */}
      {formCompletion < 70 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-yellow-700">
            <strong>Boost your listing visibility!</strong>
            <br />
            Complete more details to improve your listing's searchability and attract more buyers.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Robot Images & Media
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Add high-quality images to showcase your robot. Images significantly increase buyer interest.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div className="space-y-4">
              <Label>Upload Images (Up to 10)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <span className="text-primary hover:text-primary/80 font-medium">Click to upload images</span>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    PNG, JPG, WEBP up to 10MB each. First image will be used as the main listing image.
                  </p>
                </div>
              </div>
              
              {imagePreviewUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Robot ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      {index === 0 && (
                        <Badge className="absolute bottom-1 left-1 text-xs bg-primary">
                          Main Image
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Image URLs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label>Or Add Image URLs</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addImageUrlField}
                  disabled={imageUrls.length >= 10}
                >
                  <Link className="w-3 h-3 mr-1" />
                  Add URL
                </Button>
              </div>
              
              {imageUrls.map((url, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      value={url}
                      onChange={(e) => handleImageUrlChange(index, e.target.value)}
                      placeholder="https://example.com/robot-image.jpg"
                    />
                  </div>
                  {url && url.startsWith('http') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                  {imageUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeImage(index, false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              
              {validatingImages && (
                <p className="text-sm text-muted-foreground">Validating image URLs...</p>
              )}
            </div>

            {errors.images && (
              <p className="text-red-500 text-sm">{errors.images}</p>
            )}
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Basic Robot Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Robot Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., ABB IRB 6600 Industrial Robot"
                  className={errors.name ? 'border-red-500' : ''}
                  required
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select 
                  value={formData.brand} 
                  onValueChange={(value) => handleInputChange('brand', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select robot brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {robotBrands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  placeholder="e.g., IRB 6600"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Robot Type *</Label>
                <Select 
                  value={formData.robot_type} 
                  onValueChange={(value) => handleInputChange('robot_type', value)}
                >
                  <SelectTrigger className={errors.robot_type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select robot type" />
                  </SelectTrigger>
                  <SelectContent>
                    {robotTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.robot_type && (
                  <p className="text-red-500 text-sm">{errors.robot_type}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select 
                  value={formData.condition} 
                  onValueChange={(value) => handleInputChange('condition', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="year_manufactured">Year Manufactured</Label>
                <Input
                  id="year_manufactured"
                  type="number"
                  min="1990"
                  max={new Date().getFullYear()}
                  value={formData.year_manufactured}
                  onChange={(e) => handleInputChange('year_manufactured', parseInt(e.target.value) || new Date().getFullYear())}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">City/Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Mumbai, Pune, Chennai"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="e.g., Maharashtra, Tamil Nadu"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  placeholder="e.g., 400001"
                  maxLength={6}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Specifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Technical Specifications
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Detailed specifications help buyers find exactly what they need
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="payload_capacity">Payload (kg)</Label>
                <Input
                  id="payload_capacity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.payload_capacity || ''}
                  onChange={(e) => handleInputChange('payload_capacity', parseFloat(e.target.value) || null)}
                  placeholder="125"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reach">Reach (mm)</Label>
                <Input
                  id="reach"
                  type="number"
                  min="0"
                  value={formData.reach || ''}
                  onChange={(e) => handleInputChange('reach', parseFloat(e.target.value) || null)}
                  placeholder="2500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="repeatability">Repeatability (mm)</Label>
                <Input
                  id="repeatability"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.repeatability || ''}
                  onChange={(e) => handleInputChange('repeatability', parseFloat(e.target.value) || null)}
                  placeholder="0.05"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="power_consumption">Power (kW)</Label>
                <Input
                  id="power_consumption"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.power_consumption || ''}
                  onChange={(e) => handleInputChange('power_consumption', parseFloat(e.target.value) || null)}
                  placeholder="6.5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Operating Environment</Label>
              <Select 
                value={formData.operating_environment} 
                onValueChange={(value) => handleInputChange('operating_environment', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operating environment" />
                </SelectTrigger>
                <SelectContent>
                  {operatingEnvironments.map((env) => (
                    <SelectItem key={env} value={env}>
                      {env}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
{/* Custom Specification Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Custom Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Field Name (e.g., Payload Capacity)"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Field Value (e.g., 165kg)"
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={addCustomField} 
                size="sm" 
                disabled={!newFieldName.trim() || !newFieldValue.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {customFields.length > 0 && (
              <div className="space-y-2">
                <Label>Custom Fields</Label>
                <div className="grid gap-2">
                  {customFields.map((field, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-medium">{field.field_name}:</span>
                        <span className="ml-2">{field.field_value}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomField(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents and Media */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents & Media
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Brochure Upload */}
            <div className="space-y-2">
              <Label>Brochure/Datasheet (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleBrochureUpload}
                  className="flex-1"
                />
                {brochureFile && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <FileText className="w-4 h-4" />
                    {brochureFile.name}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Upload robot brochure or datasheet (PDF, max 10MB)</p>
            </div>

            {/* Video Upload */}
            <div className="space-y-4">
              <Label>Video</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={videoType === 'upload' ? 'default' : 'outline'}
                  onClick={() => setVideoType('upload')}
                  size="sm"
                >
                  Upload Video
                </Button>
                <Button
                  type="button"
                  variant={videoType === 'youtube' ? 'default' : 'outline'}
                  onClick={() => setVideoType('youtube')}
                  size="sm"
                >
                  YouTube Link
                </Button>
              </div>

              {videoType === 'upload' ? (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                  />
                  {videoFile && (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <Camera className="w-4 h-4" />
                      {videoFile.name}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">Upload robot demonstration video (max 100MB)</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">Add YouTube link for robot demonstration</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing & Commercial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <div className="flex gap-2">
                  <Select 
                    value={formData.currency} 
                    onValueChange={(value) => handleInputChange('currency', value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">₹ INR</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="EUR">€ EUR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.price || ''}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || null)}
                    placeholder="500000"
                    className={`flex-1 ${errors.price ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                 {errors.price && (
                   <p className="text-red-500 text-sm">{errors.price}</p>
                 )}
                 {formData.price && formData.currency !== 'INR' && (
                   <p className="text-sm text-muted-foreground">
                     ≈ ₹{convertToINR(formData.price, formData.currency).toLocaleString()} INR
                   </p>
                 )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="warranty_info">Warranty Information</Label>
                <Input
                  id="warranty_info"
                  value={formData.warranty_info}
                  onChange={(e) => handleInputChange('warranty_info', e.target.value)}
                  placeholder="e.g., 2 years manufacturer warranty"
                />
              </div>
            </div>

            {/* Services & Add-ons */}
            <div className="space-y-3">
              <Label>Additional Services Available</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="training_included"
                    checked={formData.training_included}
                    onCheckedChange={(checked) => handleInputChange('training_included', checked)}
                  />
                  <Label htmlFor="training_included" className="text-sm">
                    Training Included
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="installation_service"
                    checked={formData.installation_service}
                    onCheckedChange={(checked) => handleInputChange('installation_service', checked)}
                  />
                  <Label htmlFor="installation_service" className="text-sm">
                    Installation Service
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="maintenance_contract"
                    checked={formData.maintenance_contract}
                    onCheckedChange={(checked) => handleInputChange('maintenance_contract', checked)}
                  />
                  <Label htmlFor="maintenance_contract" className="text-sm">
                    Maintenance Contract
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="financing_available"
                    checked={formData.financing_available}
                    onCheckedChange={(checked) => handleInputChange('financing_available', checked)}
                  />
                  <Label htmlFor="financing_available" className="text-sm">
                    Financing Available
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications & Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Applications & Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Applications */}
            <div className="space-y-2">
              <Label>Primary Applications</Label>
              <div className="flex gap-2">
                <Select value={newApplication} onValueChange={setNewApplication}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select application" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonApplications.filter(app => !formData.applications.includes(app)).map((app) => (
                      <SelectItem key={app} value={app}>
                        {app}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addApplication} size="sm" disabled={!newApplication}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.applications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.applications.map((app, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {app}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeApplication(app)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Category Tags */}
            <div className="space-y-2">
              <Label>Category Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add custom tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.category_tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.category_tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Certifications & Accessories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Certifications & Included Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Certifications */}
            <div className="space-y-2">
              <Label>Certification Standards</Label>
              <div className="flex gap-2">
                <Select value={newCertification} onValueChange={setNewCertification}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select certification" />
                  </SelectTrigger>
                  <SelectContent>
                    {certificationStandards.filter(cert => !formData.certification_standards.includes(cert)).map((cert) => (
                      <SelectItem key={cert} value={cert}>
                        {cert}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addCertification} size="sm" disabled={!newCertification}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.certification_standards.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.certification_standards.map((cert, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {cert}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeCertification(cert)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Included Accessories */}
            <div className="space-y-2">
              <Label>Included Accessories</Label>
              <div className="flex gap-2">
                <Input
                  value={newAccessory}
                  onChange={(e) => setNewAccessory(e.target.value)}
                  placeholder="e.g., End effector, Teaching pendant, Cables"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAccessory())}
                />
                <Button type="button" onClick={addAccessory} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.included_accessories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.included_accessories.map((accessory, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {accessory}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeAccessory(accessory)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controller Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Controller Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="controller_type">Controller Type</Label>
              <Input
                id="controller_type"
                value={formData.controller_type}
                onChange={(e) => handleInputChange('controller_type', e.target.value)}
                placeholder="e.g., ABB IRC5, FANUC R-30iB, KUKA KRC4"
              />
            </div>
          </CardContent>
        </Card>

              {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detailed Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="description">Robot Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Provide a detailed description of your robot including its capabilities, condition, history, and any unique features that make it stand out..."
                rows={6}
                className={errors.description ? 'border-red-500' : ''}
                required
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formData.description.length} characters (minimum 50)</span>
                {errors.description && (
                  <span className="text-red-500">{errors.description}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ready to {editMode ? 'update' : 'publish'} your robot listing?</h3>
                <p className="text-sm text-muted-foreground">
                  {formCompletion >= 80 
                    ? 'Your listing looks excellent and is ready to attract buyers!' 
                    : 'Consider adding more details to improve visibility and buyer confidence.'
                  }
                </p>
              </div>
              <Button 
                type="submit" 
                disabled={loading || formCompletion < 40}
                className="bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary px-8"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-border/50"></div>
                    <span>{editMode ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {editMode ? 'Update Robot Listing' : 'Create Robot Listing'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default RobotUpload;
