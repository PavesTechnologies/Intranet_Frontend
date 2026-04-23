

"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { toast } from "react-toastify";
import { User, Briefcase, FileText, Plus, Trash2 } from "lucide-react";


export default function CreateOffer() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  // --- ADD THESE LINES HERE ---
  // This decodes the JWT payload to get the roles
  const userPayload = token ? JSON.parse(atob(token.split('.')[1])) : {};
  const rawRoles = userPayload.roles || "";
  
  // This turns "HR, General" into ["HR", "General"] so it's easy to check
  const userRoles = Array.isArray(rawRoles) 
    ? rawRoles 
    : rawRoles.split(',').map(r => r.trim());

  const isHR = userRoles.includes("HR");

  /* ================= STATE ================= */

  const [activeStep, setActiveStep] = useState(1);
  const [countries, setCountries] = useState([]);
  const [ccOptions, setCcOptions] = useState([]);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    mail: "",
    country_code: "",
    contact_number: "",
    designation: "",
    employee_type: "",
    cc_mails: [],
  });

  const [components, setComponents] = useState([
    {
      id: Date.now(),
      name: "",
      type: "",
      frequency: "",
      amount: "",
    },
  ]);

  const typeOptions = [
  { label: "Fixed", value: "Fixed" },
  { label: "Variable", value: "Variable" },
  { label: "Bonus", value: "Bonus" },
];

const frequencyOptions = [
  { label: "Monthly", value: "Monthly" },
  { label: "Quarterly", value: "Quarterly" },
  { label: "Yearly", value: "Yearly" },
];

  /* ================= STEPS ================= */

  const steps = [
    {
      id: 1,
      title: "Basic Details",
      desc: "Candidate personal & job information",
      icon: <User size={18} />,
    },
    {
      id: 2,
      title: "Compensation",
      desc: "Salary structure and CTC breakdown",
      icon: <Briefcase size={18} />,
    },
    {
      id: 3,
      title: "Create Offer",
      desc: "Preview and generate offer letter",
      icon: <FileText size={18} />,
    },
  ];

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    const loadCountries = async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/masters/country`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCountries(
        res.data
          .filter((c) => c.is_active)
          .map((c) => ({
            label: `${c.country_name} (${c.calling_code})`,
            value: c.calling_code,
          }))
      );
    };

    const loadCC = async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/offer-approval/admin-users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCcOptions(
        res.data.map((u) => ({
          value: u.mail,
          label: `${u.name} (${u.mail})`,
        }))
      );
    };

    loadCountries();
    loadCC();
  }, []);

  /* ================= HANDLERS ================= */

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleComponentChange = (id, field, value) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const addComponent = () => {
    setComponents([
      ...components,
      {
        id: Date.now(),
        name: "",
        type: "",
        frequency: "",
        amount: "",
      },
    ]);
  };

  const removeComponent = (id) => {
    setComponents(components.filter((c) => c.id !== id));
  };

  const totalCTC = components.reduce(
    (sum, c) => sum + Number(c.amount || 0),
    0
  );

  /* ================= CREATE OFFER ================= */

  const handleCreateOffer = async () => {
    const payload = {
      ...formData,
      cc_mails: formData.cc_mails.map((c) => c.value) || [],
      compensation_components: components.map((c)=>({
        name:c.name,
        type:c.type,
        frequency:c.frequency,
        amount:Number(c.amount)
      })),
      total_ctc: Number(totalCTC),
    };
     

    const toastId = toast.loading("Creating offer...");

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/offerletters/create`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.update(toastId, {
        render: "Offer Created",
        type: "success",
        isLoading: false,
        autoClose: 1200,
      });
    //  // 🔥 OPEN PREVIEW IN NEW TAB
    //   window.open(
    //     `/employee-onboarding/offer-generated-preview/${res.data.offer_id}`,
    //     "_blank"
    //   );
    navigate(`/employee-onboarding/offer-generated-preview/${res.data.offer_id}`);
         
    }catch(err){

      
      toast.update(toastId, {
        render: err.response?.data?.detail || "Error",
        type: "error",
        isLoading: false,
      });
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* ===== PROGRESS SIDEBAR ===== */}
      <div className="w-80 bg-gradient-to-b from-blue-700 to-blue-900 text-white p-10">

        <h2 className="text-xl font-semibold mb-10">
          Offer Creation
        </h2>

        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-[2px] bg-blue-500/40" />

          <div className="space-y-10">
            {steps.map((step) => {
              const active = activeStep === step.id;
              const completed = activeStep > step.id;

              return (
                <div key={step.id} className="flex gap-4 items-start">
                  <div
                    className={`
                      relative z-10 w-10 h-10 flex items-center justify-center rounded-full
                      ${
                        completed
                          ? "bg-green-500"
                          : active
                          ? "bg-white text-blue-700"
                          : "bg-blue-600"
                      }
                    `}
                  >
                    {step.icon}
                  </div>

                  <div>
                    <div className={`font-medium ${active ? "text-white" : "text-blue-100"}`}>
                      {step.title}
                    </div>
                    <div className="text-sm text-blue-200">
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="flex-1 p-10 space-y-6">

        {/* STEP 1 */}
        {activeStep === 1 && (
          <>
            <h3 className="text-2xl font-semibold">Candidate Info</h3>

            <div className="grid grid-cols-2 gap-6">
              <Input label="First Name" name="first_name" value={formData.first_name} onChange={handleChange}/>
              <Input label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange}/>
              <Input label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange}/>
            </div>

            <Input label="Email" name="mail" value={formData.mail} onChange={handleChange}/>

            <div className="grid grid-cols-2 gap-6">
              <SelectInput label="Country Code" options={countries} onChange={(v)=>setFormData({...formData,country_code:v?.value})}/>
              <Input label="Contact Number" name="contact_number" value={formData.contact_number} onChange={handleChange}/>
            </div>

            <Input label="Designation" name="designation" value={formData.designation} onChange={handleChange}/>

            <SelectInput
              label="Employee Type"
              options={[
                {label:"Full-Time",value:"Full-Time"},
                {label:"Part-Time",value:"Part-Time"},
                {label:"Contractor",value:"Contractor"},
                {label:"Intern",value:"Intern"},
              ]}
              onChange={(v)=>setFormData({...formData,employee_type:v?.value})}
            />

            <SelectInput
              label="CC Mails"
              isMulti
              options={ccOptions}
              value={formData.cc_mails}
              onChange={(v)=>setFormData({...formData,cc_mails:v||[]})}
            />

            <div className="flex justify-end">
              <button onClick={()=>setActiveStep(2)} className="px-6 py-2 bg-blue-700 text-white rounded-lg">
                Continue →
              </button>
            </div>
          </>
        )}

        {/* STEP 2 */}
        {activeStep === 2 && (
          <>
            <h3 className="text-2xl font-semibold">Compensation</h3>

            <div className="bg-blue-50 p-4 rounded-lg">
              Annual CTC: ₹ {totalCTC.toLocaleString()}
            </div>

            {components.map((c)=>(
              <div key={c.id} className="grid grid-cols-5 gap-4 items-end">
                <Input label="Component" value={c.name} onChange={(e)=>handleComponentChange(c.id,"name",e.target.value)}/>
                <SelectInput
                    label="Type"
                    options={typeOptions}
                    value={typeOptions.find(opt => opt.value === c.type)}
                    onChange={(v)=>handleComponentChange(c.id,"type",v?.value)}
                  />

                  <SelectInput
                    label="Frequency"
                    options={frequencyOptions}
                    value={frequencyOptions.find(opt => opt.value === c.frequency)}
                    onChange={(v)=>handleComponentChange(c.id,"frequency",v?.value)}
                  />
                <Input type="number" label="Amount" value={c.amount} onChange={(e)=>handleComponentChange(c.id,"amount",e.target.value)}/>
                <button onClick={()=>removeComponent(c.id)}><Trash2 size={18} className="text-red-500"/></button>
              </div>
            ))}

            <button onClick={addComponent} className="flex items-center gap-2 text-blue-700">
              <Plus size={16}/> Add Component
            </button>

            <div className="flex justify-between">
              <button onClick={()=>setActiveStep(1)} className="px-6 py-2 bg-gray-200 rounded-lg">Back</button>
              <button onClick={()=>setActiveStep(3)} className="px-6 py-2 bg-blue-700 text-white rounded-lg">Continue →</button>
            </div>
          </>
        )}

        {/* STEP 3 */}
        {activeStep === 3 && (
          <>
            <h3 className="text-2xl font-semibold">Create Offer</h3>

            {/* <div className="border rounded-lg p-6 text-sm space-y-2">
              <p><b>Name:</b> {formData.first_name} {formData.middle_name} {formData.last_name}</p>
              <p><b>Email:</b> {formData.mail}</p>
              <p><b>Designation:</b> {formData.designation}</p>
              <p><b>Employee Type:</b> {formData.employee_type}</p>
              <p><b>Annual CTC:</b> ₹ {totalCTC.toLocaleString()}</p>
            </div> */}
            <div className="border rounded-lg p-6 text-sm space-y-4">

  <p><b>Name:</b> {formData.first_name} {formData.middle_name} {formData.last_name}</p>
  <p><b>Email:</b> {formData.mail}</p>
  <p><b>Designation:</b> {formData.designation}</p>
  <p><b>Employee Type:</b> {formData.employee_type}</p>

  <p><b>Annual CTC:</b> ₹ {totalCTC.toLocaleString()}</p>

  {/* Salary Breakdown Table */}

  <div className="mt-4">
    <p className="font-semibold mb-2">Salary Breakdown:</p>

    <table className="w-full border text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="border p-2">Component</th>
          <th className="border p-2">Type</th>
          <th className="border p-2">Frequency</th>
          <th className="border p-2">Amount</th>
        </tr>
      </thead>

      <tbody>
        {components.map((c) => (
          <tr key={c.id}>
            <td className="border p-2">{c.name}</td>
            <td className="border p-2">{c.type}</td>
            <td className="border p-2">{c.frequency}</td>
            <td className="border p-2">₹ {Number(c.amount || 0).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

</div>

            <div className="flex justify-between">
              <button onClick={()=>setActiveStep(2)} className="px-6 py-2 bg-gray-200 rounded-lg">Back</button>
              {isHR ? (
  <button 
    onClick={handleCreateOffer} 
    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
  >
    Create Offer & Preview
  </button>
) : (
  <div className="text-red-500 font-medium px-4 py-2 bg-red-50 border border-red-100 rounded-lg">
    ⚠️ You do not have permission to generate this document.
  </div>
)}
      
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* SMALL COMPONENTS */

function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-sm block mb-1">{label}</label>
      <input {...props} className="w-full border rounded-lg px-3 py-2"/>
    </div>
  );
}

function SelectInput({ label, ...props }) {
  return (
    <div>
      <label className="text-sm block mb-1">{label}</label>
      <Select {...props}/>
    </div>
  );
}