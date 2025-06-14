import emailjs from '@emailjs/browser';

export const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_e0mdn38',
  TEMPLATE_ID: 'template_fka0clk',
  PUBLIC_KEY: 'ojTQ6JQvzMxVKGi0B',
};

// Initialize EmailJS with your public key
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

// Function to validate EmailJS configuration
export const validateEmailJSConfig = () => {
  const missingFields = [];
  if (!EMAILJS_CONFIG.SERVICE_ID) missingFields.push('SERVICE_ID');
  if (!EMAILJS_CONFIG.TEMPLATE_ID) missingFields.push('TEMPLATE_ID');
  if (!EMAILJS_CONFIG.PUBLIC_KEY) missingFields.push('PUBLIC_KEY');

  if (missingFields.length > 0) {
    console.error('Missing EmailJS configuration:', missingFields.join(', '));
    return false;
  }
  return true;
}; 