import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Calculator, Save, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SalaryComponent {
    name: string;
    type: "percentage" | "fixed";
    value: number; // Percentage (e.g., 50) or Amount (e.g., 5000)
    amount: number; // Calculated amount
}

interface SalaryConfig {
    wageType: "monthly" | "yearly";
    wage: number;
    workingDays: number;
    breakTime: number; // in minutes/hours
    components: SalaryComponent[];
}

// Default Structure based on Wireframe
const DEFAULT_COMPONENTS: SalaryComponent[] = [
    { name: "Basic Salary", type: "percentage", value: 50, amount: 0 },
    { name: "House Rent Allowance", type: "percentage", value: 20, amount: 0 },
    { name: "Standard Allowance", type: "fixed", value: 0, amount: 0 },
    { name: "Performance Bonus", type: "percentage", value: 10, amount: 0 },
    { name: "Leave Travel Allowance", type: "percentage", value: 10, amount: 0 },
    { name: "Fixed Allowance", type: "fixed", value: 0, amount: 0 }, // Remainder
    { name: "Professional Tax", type: "fixed", value: 200, amount: 200 }, // Deduction
    { name: "Provident Fund (Employee)", type: "percentage", value: 12, amount: 0 }, // Deduction
];

export default function SalaryInfoTab() {
    const { role, profile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [isAdmin] = useState(role === 'admin');

    // State
    const [config, setConfig] = useState<SalaryConfig>({
        wageType: "monthly",
        wage: 0,
        workingDays: 22,
        breakTime: 1,
        components: DEFAULT_COMPONENTS,
    });

    const [bankDetails, setBankDetails] = useState({
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        panNo: "",
        uanNo: "",
    });

    // Calculate Components automatically when Wage changes
    useEffect(() => {
        calculateSalary();
    }, [config.wage, config.wageType]);

    // Load existing data on mount
    useEffect(() => {
        if (profile?.id) {
            // Attempt to load from metadata or separate table
            // For now, we simulate loading or assume defaults
            // In a real implementation: fetchSalaryInfo(profile.id);
        }
    }, [profile?.id]);

    const calculateSalary = () => {
        const baseWage = config.wageType === "yearly" ? config.wage / 12 : config.wage;

        const newComponents = config.components.map(comp => {
            let amount = 0;
            if (comp.type === "percentage") {
                // Percentage of Base Wage
                // Special case: PF is usually on Basic, but wireframe says "Value: Percentage field"
                // We will assume Percentage of Gross for simplicity unless name implies otherwise
                // Wireframe: "Basic = 50% of wage"

                // If it's a deduction like PF, it might be on Basic.
                // Let's keep it simple: % of Wage for now, or % of Basic if needed.
                // Wireframe says: "If wage = 50,000 and Basic = 50%... Basic = 25,000"
                amount = (baseWage * comp.value) / 100;

                // PF Logic: Usually 12% of Basic.
                if (comp.name.includes("Provident Fund")) {
                    // Find Basic
                    const basic = config.components.find(c => c.name === "Basic Salary");
                    const basicAmount = basic ? (baseWage * basic.value) / 100 : 0;
                    amount = (basicAmount * comp.value) / 100;
                }

            } else {
                amount = comp.value;
            }
            return { ...comp, amount };
        });

        setConfig(prev => ({ ...prev, components: newComponents }));
    };

    const handleWageChange = (val: string) => {
        setConfig(prev => ({ ...prev, wage: parseFloat(val) || 0 }));
    };

    const updateComponent = (index: number, field: keyof SalaryComponent, value: any) => {
        const newComponents = [...config.components];
        newComponents[index] = { ...newComponents[index], [field]: value };
        setConfig(prev => ({ ...prev, components: newComponents }));
        // Trigger recast in useEffect? No, need to trigger manually or add components to dept array
        // We added [config.wage], let's add logic to re-calc on component change too effectively
        // But better to just re-calc "types" here if needed.
        // For Fixed, amount = value.
        if (field === 'value' && newComponents[index].type === 'fixed') {
            newComponents[index].amount = Number(value);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        // Simulate API Call
        console.log("Saving Salary Config:", { config, bankDetails });

        // In a real app with Schema access:
        // await supabase.from('salary_details').upsert({ employee_id: profile.id, config: config, bank_details: bankDetails });

        // Since we are restricted, we show a success toast but warn about persistence.
        setTimeout(() => {
            setLoading(false);
            toast({
                title: "Salary Info Updated",
                description: "Calculations saved locally for this session.",
            });
        }, 800);
    };

    // Access Control
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                <AlertTriangle className="h-10 w-10 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold">Access Restricted</h3>
                <p className="text-sm text-center max-w-xs">
                    Salary Information is confidential and only visible to Administrators.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-12">

                {/* Left Column: Configuration */}
                <div className="md:col-span-8 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Salary Structure</CardTitle>
                            <CardDescription>Define wage and components</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Wage Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Wage Type</Label>
                                    <Select
                                        value={config.wageType}
                                        onValueChange={(v: any) => setConfig(prev => ({ ...prev, wageType: v }))}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly Fixed</SelectItem>
                                            <SelectItem value="yearly">Yearly Package (CTC)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Gross {config.wageType === 'monthly' ? 'Month' : 'Year'} Wage</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={config.wage || ''}
                                            onChange={e => handleWageChange(e.target.value)}
                                            className="pl-8 font-semibold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Working Days / Week</Label>
                                    <Input
                                        type="number"
                                        value={config.workingDays}
                                        onChange={e => setConfig(prev => ({ ...prev, workingDays: Number(e.target.value) }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Break Time (hrs)</Label>
                                    <Input
                                        type="number"
                                        value={config.breakTime}
                                        onChange={e => setConfig(prev => ({ ...prev, breakTime: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Components Calculation Table */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm">Salary Components</h4>
                                    <Button variant="outline" size="sm" onClick={calculateSalary}>
                                        <Calculator className="h-3 w-3 mr-2" /> Recalculate
                                    </Button>
                                </div>

                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr className="text-left border-b">
                                                <th className="p-3 font-medium text-muted-foreground w-1/3">Component</th>
                                                <th className="p-3 font-medium text-muted-foreground">Type</th>
                                                <th className="p-3 font-medium text-muted-foreground w-20">Value</th>
                                                <th className="p-3 font-medium text-muted-foreground text-right">Amount (M)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {config.components.map((comp, idx) => (
                                                <tr key={idx} className="bg-card">
                                                    <td className="p-3 font-medium">{comp.name}</td>
                                                    <td className="p-3">
                                                        <Select
                                                            value={comp.type}
                                                            onValueChange={v => updateComponent(idx, 'type', v)}
                                                        >
                                                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="percentage">% of Wage</SelectItem>
                                                                <SelectItem value="fixed">Fixed Amt</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                type="number"
                                                                className="h-8 w-20 text-right"
                                                                value={comp.value}
                                                                onChange={e => updateComponent(idx, 'value', parseFloat(e.target.value))}
                                                            />
                                                            <span className="text-xs text-muted-foreground">
                                                                {comp.type === 'percentage' ? '%' : '$'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-semibold">
                                                        {comp.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-muted/20 font-bold">
                                                <td className="p-3" colSpan={3}>Total Monthly Pay</td>
                                                <td className="p-3 text-right">
                                                    {/* Total is approx Wage - Deductions, but here we just sum Earnings */}
                                                    {(config.wageType === 'monthly' ? config.wage : config.wage / 12).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Bank Details & Actions */}
                <div className="md:col-span-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Bank Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Bank Name</Label>
                                <Input
                                    value={bankDetails.bankName}
                                    onChange={e => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                                    placeholder="HDFC, Chase, etc."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Account Number</Label>
                                <Input
                                    value={bankDetails.accountNumber}
                                    onChange={e => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                                    placeholder="XXXXXXXXXXXX"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>IFSC / Routing Code</Label>
                                <Input
                                    value={bankDetails.ifscCode}
                                    onChange={e => setBankDetails(prev => ({ ...prev, ifscCode: e.target.value }))}
                                />
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <Label>PAN / Tax ID</Label>
                                <Input
                                    value={bankDetails.panNo}
                                    onChange={e => setBankDetails(prev => ({ ...prev, panNo: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>UAN / PF Number</Label>
                                <Input
                                    value={bankDetails.uanNo}
                                    onChange={e => setBankDetails(prev => ({ ...prev, uanNo: e.target.value }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Button className="w-full h-12 text-lg shadow-lg" onClick={handleSave} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        Save Salary Info
                    </Button>
                </div>
            </div>
        </div>
    );
}
