/**
 * Profile Controller
 * Handles business profile operations
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Get user's business info
 */
const getBusinessInfo = async (req, res) => {
  try {
    const userId = req.user_id;

    if (!supabase) {
      // Return empty data if Supabase not configured
      return res.json({
        success: true,
        data: {
          company_name: '',
          job_title: '',
          industry: '',
          bio: '',
          website: '',
          location: ''
        }
      });
    }

    const { data, error } = await supabase
      .from('user_business_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    res.json({
      success: true,
      data: data || {
        company_name: '',
        job_title: '',
        industry: '',
        bio: '',
        website: '',
        location: ''
      }
    });
  } catch (error) {
    console.error('Error getting business info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get business info'
    });
  }
};

/**
 * Update user's business info
 */
const updateBusinessInfo = async (req, res) => {
  try {
    const userId = req.user_id;
    const { company_name, job_title, industry, bio, website, location, company_logo_url } = req.body;

    if (!supabase) {
      // Return success for demo mode
      return res.json({
        success: true,
        data: req.body
      });
    }

    // Check if record exists
    const { data: existing } = await supabase
      .from('user_business_info')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      // Update existing record
      result = await supabase
        .from('user_business_info')
        .update({
          company_name,
          job_title,
          industry,
          bio,
          website,
          location,
          company_logo_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // Insert new record
      result = await supabase
        .from('user_business_info')
        .insert({
          user_id: userId,
          company_name,
          job_title,
          industry,
          bio,
          website,
          location,
          company_logo_url
        })
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error updating business info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update business info'
    });
  }
};

/**
 * Sync LinkedIn profile to business info
 */
const syncLinkedInProfile = async (req, res) => {
  try {
    const userId = req.user_id;
    const { import_fields, linkedin_data } = req.body;

    if (!linkedin_data) {
      return res.status(400).json({
        success: false,
        error: 'LinkedIn data is required'
      });
    }

    // Map LinkedIn fields to business info
    const updates = {};
    
    if (import_fields.includes('name') && linkedin_data.name) {
      // Name is stored in user profile, not business info
    }
    if (import_fields.includes('headline') && linkedin_data.headline) {
      updates.job_title = linkedin_data.headline;
    }
    if (import_fields.includes('company') && linkedin_data.company) {
      updates.company_name = linkedin_data.company;
    }
    if (import_fields.includes('position') && linkedin_data.position) {
      updates.job_title = linkedin_data.position;
    }

    if (!supabase) {
      return res.json({
        success: true,
        data: updates
      });
    }

    // Update business info
    const { data: existing } = await supabase
      .from('user_business_info')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('user_business_info')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('user_business_info')
        .insert({
          user_id: userId,
          ...updates
        })
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    res.json({
      success: true,
      data: result.data,
      imported_fields: Object.keys(updates)
    });
  } catch (error) {
    console.error('Error syncing LinkedIn profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync LinkedIn profile'
    });
  }
};

module.exports = {
  getBusinessInfo,
  updateBusinessInfo,
  syncLinkedInProfile
};
