import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG, validateEmailJSConfig } from '../config/emailjs';

export interface AgencyEmail {
  email: string;
  description: string;
  keywords: string[];
}

export const AGENCY_EMAILS: AgencyEmail[] = [
  {
    email: 'ashie23122312@gmail.com',
    description: 'Test Agency',
    keywords: ['test']
  },
  {
    email: 'actioncenter@denr.gov.ph',
    description: 'DENR Action Center',
    keywords: ['environmental', 'pollution', 'waste', 'air', 'water', 'soil']
  },
  {
    email: 'aksyonkalikasan@denr.gov.ph',
    description: 'Aksyon Kalikasan – environmental violations',
    keywords: ['environmental', 'conservation', 'protection', 'wildlife', 'forest', 'tree']
  },
  {
    email: 'eia@emb.gov.ph',
    description: 'Environmental Impact Assessment – project-related reviews',
    keywords: ['project', 'construction', 'development', 'impact', 'assessment']
  },
  {
    email: 'info@llda.gov.ph',
    description: 'Laguna Lake violations',
    keywords: ['laguna', 'lake', 'water', 'fishing', 'aquatic']
  },
  {
    email: 'bpld@quezoncity.gov.ph',
    description: 'Business Permit issues',
    keywords: ['business', 'permit', 'license', 'quezon']
  },
  {
    email: 'legal.bpld@quezoncity.gov.ph',
    description: 'Legal enforcement of permits',
    keywords: ['legal', 'enforcement', 'violation', 'quezon']
  },
  {
    email: 'dbo@quezoncity.gov.ph',
    description: 'Building code violations',
    keywords: ['building', 'construction', 'structure', 'quezon']
  },
  {
    email: 'idpd.cpdd@quezoncity.gov.ph',
    description: 'Zoning & land use',
    keywords: ['zoning', 'land', 'use', 'planning', 'quezon']
  },
  {
    email: 'bplo@taguig.gov.ph',
    description: 'Business permit violations',
    keywords: ['business', 'permit', 'taguig']
  },
  {
    email: 'lbo@taguig.gov.ph',
    description: 'Building and construction violations',
    keywords: ['building', 'construction', 'taguig']
  },
  {
    email: 'cpdo@taguig.gov.ph',
    description: 'Planning and zoning',
    keywords: ['planning', 'zoning', 'taguig']
  },
  {
    email: 'towertaguig@gmail.com',
    description: 'Taguig Environmental Reporting',
    keywords: ['environmental', 'taguig']
  },
  {
    email: 'obo@makati.gov.ph',
    description: 'Building violations',
    keywords: ['building', 'construction', 'makati']
  }
];

export const findAppropriateAgency = (
  reportType: string,
  description: string,
  city?: string
): AgencyEmail => {
  // First try to match by city
  if (city) {
    const cityAgency = AGENCY_EMAILS.find(agency => 
      agency.description.toLowerCase().includes(city.toLowerCase())
    );
    if (cityAgency) return cityAgency;
  }

  // Then try to match by keywords
  const descriptionLower = description.toLowerCase();
  const matchingAgency = AGENCY_EMAILS.find(agency =>
    agency.keywords.some(keyword => descriptionLower.includes(keyword))
  );

  return matchingAgency || AGENCY_EMAILS[0]; // Default to first agency if no match
};

export const generateEmailContent = (
  reportType: string,
  description: string,
  location: string,
  imageUrl?: string,
  category?: string,
  city?: string,
  violationType?: string
) => {
  // Create a simple object with all required fields
  const templateParams = {
    report_type: String(reportType || 'Not specified'),
    location: String(location || 'Not specified'),
    description: String(description || 'Not specified'),
    image_url: String(imageUrl || ''),
    category: String(category || ''),
    city: String(city || ''),
    violation_type: String(violationType || '')
  };

  // Log the parameters for debugging
  console.log('Generated email content:', templateParams);

  const subject = `New ${reportType || 'Violation'} Report${city ? ` in ${city}` : ''}`;
  
  return { subject, templateParams };
};

export const sendEmail = async (
  toEmail: string,
  subject: string,
  templateParams: any
): Promise<boolean> => {
  try {
    // Validate EmailJS configuration
    if (!validateEmailJSConfig()) {
      throw new Error('EmailJS configuration is incomplete');
    }

    // Format the message with proper line breaks and spacing
    const messageContent = [
      `Report Type: ${templateParams.report_type || 'Not specified'}`,
      `Location: ${templateParams.location || 'Not specified'}`,
      `Description: ${templateParams.description || 'Not specified'}`,
      templateParams.category ? `Category: ${templateParams.category}` : null,
      templateParams.city ? `City: ${templateParams.city}` : null,
      templateParams.violation_type ? `Violation Type: ${templateParams.violation_type}` : null,
      templateParams.image_url ? `Image URL: ${templateParams.image_url}` : null
    ]
      .filter(Boolean) // Remove null/undefined values
      .join('\n\n'); // Add double line breaks between items

    // Create the parameters object
    const params = {
      to_email: toEmail,
      subject: subject,
      message: messageContent
    };

    // Log the exact content being sent
    console.log('Sending email with content:', {
      to_email: params.to_email,
      subject: params.subject,
      message: params.message
    });

    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      params
    );

    console.log('EmailJS response:', response);
    
    if (response.status !== 200) {
      throw new Error(`EmailJS returned status ${response.status}`);
    }

    return true;
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}; 