import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calculator, Save, Info, Banknote, Landmark, CreditCard, UserCheck, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SalaryConfig {
    wageType: "monthly" | "yearly";
    wage: number;
    workingDays: number;
    breakTime: number;

    // Earnings
    basicPercent: number;
    hraPercent: number; // % of Basic
    standardAmount: number;
    bonusPercent: number; // % of Basic
    ltaPercent: number; // % of Basic

    // Deductions
    pfEmployeePercent: number; // % of Basic
    pfEmployerPercent: number; // % of Basic
    professionalTax: number;
}

export default function SalaryStructureManager({ employeeId, employeeName }: { employeeId: string, employeeName: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [config, setConfig] = useState<SalaryConfig>({
        wageType: "monthly",
        wage: 0,
        workingDays: 5,
        breakTime: 1,
        basicPercent: 50,
        hraPercent: 50,
        standardAmount: 4167,
        bonusPercent: 8.33,
        ltaPercent: 8.33,
        pfEmployeePercent: 12,
        pfEmployerPercent: 12,
        professionalTax: 200,
    });

    const [bankDetails, setBankDetails] = useState({
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        panNo: "",
        uanNo: "",
    });

    // Calculated fields
    const monthlyWage = config.wageType === "yearly" ? config.wage / 12 : config.wage;
    const basicAmount = (monthlyWage * config.basicPercent) / 100;
    const hraAmount = (basicAmount * config.hraPercent) / 100;
    const bonusAmount = (basicAmount * config.bonusPercent) / 100;
    const ltaAmount = (basicAmount * config.ltaPercent) / 100;
    const standardAmount = config.standardAmount;

    // Fixed Allowance = Wage - (Basic + HRA + Standard + Bonus + LTA)
    const subtotalEarnings = basicAmount + hraAmount + standardAmount + bonusAmount + ltaAmount;
    const fixedAllowanceAmount = Math.max(0, monthlyWage - subtotalEarnings);
    const fixedAllowancePercent = monthlyWage > 0 ? (fixedAllowanceAmount / monthlyWage) * 100 : 0;

    // Deductions (Calculated based on Basic)
    const pfEmployeeAmount = (basicAmount * config.pfEmployeePercent) / 100;
    const pfEmployerAmount = (basicAmount * config.pfEmployerPercent) / 100;

    useEffect(() => {
        const loadSalaryData = async () => {
            if (!employeeId) return;
            setFetching(true);

            try {
                const { data, error } = await supabase
                    .from('salary_details')
                    .select('*')
                    .eq('employee_id', employeeId)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                if (data) {
                    const comps = data.components as any || {};
                    setConfig({
                        wageType: data.wage_type || "monthly",
                        wage: data.wage || 0,
                        workingDays: data.working_days || 5,
                        break_time: data.break_time || 1,
                        basicPercent: comps.basicPercent ?? 50,
                        hraPercent: comps.hraPercent ?? 50,
                        standardAmount: comps.standardAmount ?? 4167,
                        bonusPercent: comps.bonusPercent ?? 8.33,
                        ltaPercent: comps.ltaPercent ?? 8.33,
                        pfEmployeePercent: comps.pfEmployeePercent ?? 12,
                        pfEmployerPercent: comps.pfEmployerPercent ?? 12,
                        professionalTax: comps.professionalTax ?? 200,
                    } as any);

                    setBankDetails({
                        bankName: data.bank_name || "",
                        accountNumber: data.account_number || "",
                        ifscCode: data.ifsc_code || "",
                        panNo: data.pan_no || "",
                        uanNo: data.uan_no || "",
                    });
                }
            } catch (err: any) {
                console.error('Error loading salary data:', err);
            } finally {
                setFetching(false);
            }
        };

        loadSalaryData();
    }, [employeeId]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('salary_details')
                .upsert({
                    employee_id: employeeId,
                    wage_type: config.wageType,
                    wage: config.wage,
                    working_days: config.workingDays,
                    break_time: config.breakTime,
                    components: {
                        basicPercent: config.basicPercent,
                        hraPercent: config.hraPercent,
                        standardAmount: config.standardAmount,
                        bonusPercent: config.bonusPercent,
                        ltaPercent: config.ltaPercent,
                        pfEmployeePercent: config.pfEmployeePercent,
                        pfEmployerPercent: config.pfEmployerPercent,
                        professionalTax: config.professionalTax,
                        basicAmount,
                        hraAmount,
                        bonusAmount,
                        ltaAmount,
                        pfEmployeeAmount,
                        pfEmployerAmount,
                        fixedAllowanceAmount
                    },
                    bank_name: bankDetails.bankName || null,
                    account_number: bankDetails.accountNumber || null,
                    ifsc_code: bankDetails.ifscCode || null,
                    pan_no: bankDetails.panNo || null,
                    uan_no: bankDetails.uanNo || null,
                });

            if (error) throw error;

            toast({ title: "✅ Saved Successfully", description: `Salary structure updated for ${employeeName}` });
        } catch (err: any) {
            toast({ title: "❌ Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex h-[400px] items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-muted">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <Landmark className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight">{employeeName}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Info className="h-3 w-3" /> Defining monthly salary components based on defined wage.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monthly Net Pay</p>
                        <p className="text-2xl font-black text-primary">₹{(monthlyWage - pfEmployeeAmount - config.professionalTax).toLocaleString()}</p>
                    </div>
                    <Button onClick={handleSave} disabled={loading} className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Structure
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Left Side: General & Earnings */}
                <div className="md:col-span-8 space-y-6">
                    {/* General Wage Config */}
                    <Card className="border-muted shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/20 border-b border-muted">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Landmark className="h-4 w-4" /> Wage & Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wage Type</Label>
                                    <Select value={config.wageType} onValueChange={(v: any) => setConfig({ ...config, wageType: v })}>
                                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly Fixed</SelectItem>
                                            <SelectItem value="yearly">Yearly Package (CTC)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Month Wage Amount</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                        <Input
                                            type="number"
                                            value={config.wageType === 'monthly' ? config.wage : config.wage / 12}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setConfig({ ...config, wage: config.wageType === 'monthly' ? val : val * 12 });
                                            }}
                                            className="pl-8 h-12 text-lg font-bold bg-primary/[0.03] border-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">Approx. ₹{(config.wageType === 'yearly' ? config.wage : config.wage * 12).toLocaleString()} / yearly wage</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center block">Schedule Info</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 text-center">
                                            <Input
                                                type="number"
                                                value={config.workingDays}
                                                onChange={e => setConfig({ ...config, workingDays: Number(e.target.value) })}
                                                className="text-center h-10 font-bold"
                                            />
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Days / week</p>
                                        </div>
                                        <div className="space-y-2 text-center">
                                            <Input
                                                type="number"
                                                value={config.breakTime}
                                                onChange={e => setConfig({ ...config, breakTime: Number(e.target.value) })}
                                                className="text-center h-10 font-bold"
                                            />
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Break / hrs</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Earnings Section */}
                    <Card className="border-muted shadow-sm overflow-hidden">
                        <CardHeader className="bg-green-50/50 border-b border-green-100">
                            <CardTitle className="text-base flex items-center gap-2 text-green-700">
                                <Landmark className="h-4 w-4" /> Earnings (Monthly)
                            </CardTitle>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/30 border-b border-muted">
                                    <tr className="text-left">
                                        <th className="p-4 text-xs font-bold uppercase text-muted-foreground">Component</th>
                                        <th className="p-4 text-xs font-bold uppercase text-muted-foreground w-32">Config</th>
                                        <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-muted/50">
                                    <tr>
                                        <td className="p-4 align-top">
                                            <p className="font-bold text-sm">Basic Salary</p>
                                            <p className="text-[10px] text-muted-foreground italic">50% of monthly wages is standard</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    value={config.basicPercent}
                                                    onChange={e => setConfig({ ...config, basicPercent: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-right font-bold w-16"
                                                />
                                                <span className="text-xs font-bold">%</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">of Monthly Wage</p>
                                        </td>
                                        <td className="p-4 text-right font-bold text-sm">
                                            ₹{basicAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 align-top">
                                            <p className="font-bold text-sm">House Rent Allowance (HRA)</p>
                                            <p className="text-[10px] text-muted-foreground italic">Usually 50% of the Basic Salary</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    value={config.hraPercent}
                                                    onChange={e => setConfig({ ...config, hraPercent: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-right font-bold w-16"
                                                />
                                                <span className="text-xs font-bold">%</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">of Basic Salary</p>
                                        </td>
                                        <td className="p-4 text-right font-bold text-sm">
                                            ₹{hraAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 align-top">
                                            <p className="font-bold text-sm">Standard Allowance</p>
                                            <p className="text-[10px] text-muted-foreground italic">Fixed amount provided to employee</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    value={config.standardAmount}
                                                    onChange={e => setConfig({ ...config, standardAmount: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-right font-bold w-24"
                                                />
                                                <span className="text-xs font-bold">pkg</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1 ml-1">fixed amount</p>
                                        </td>
                                        <td className="p-4 text-right font-bold text-sm">
                                            ₹{standardAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 align-top">
                                            <p className="font-bold text-sm">Performance Bonus</p>
                                            <p className="text-[10px] text-muted-foreground italic">Variable amount based on performance (%)</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    value={config.bonusPercent}
                                                    onChange={e => setConfig({ ...config, bonusPercent: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-right font-bold w-16"
                                                />
                                                <span className="text-xs font-bold">%</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">of Basic Salary</p>
                                        </td>
                                        <td className="p-4 text-right font-bold text-sm">
                                            ₹{bonusAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 align-top">
                                            <p className="font-bold text-sm">Leave Travel Allowance (LTA)</p>
                                            <p className="text-[10px] text-muted-foreground italic">Provided to cover travel expenses (%)</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    value={config.ltaPercent}
                                                    onChange={e => setConfig({ ...config, ltaPercent: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-right font-bold w-16"
                                                />
                                                <span className="text-xs font-bold">%</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">of Basic Salary</p>
                                        </td>
                                        <td className="p-4 text-right font-bold text-sm">
                                            ₹{ltaAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr className="bg-green-50/30">
                                        <td className="p-4 align-top">
                                            <p className="font-bold text-sm text-green-700">Fixed Allowance</p>
                                            <p className="text-[10px] text-muted-foreground italic underline">Auto-calculated remaining balance</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-black text-green-600">{fixedAllowancePercent.toFixed(2)}%</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">of Monthly Wage</p>
                                        </td>
                                        <td className="p-4 text-right font-bold text-sm text-green-700">
                                            ₹{fixedAllowanceAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Right Side: PF, Tax, and Bank */}
                <div className="md:col-span-4 space-y-6">
                    {/* PF & Social Security */}
                    <Card className="border-muted shadow-sm overflow-hidden border-l-4 border-l-blue-500">
                        <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 font-bold uppercase tracking-tight">
                                <ShieldCheck className="h-4 w-4" /> PF Contribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">Employee 12%</Label>
                                    <p className="text-xs text-muted-foreground italic">Based on Basic</p>
                                </div>
                                <p className="text-lg font-black text-blue-600">₹{pfEmployeeAmount.toLocaleString()}</p>
                            </div>
                            <Separator className="bg-blue-100/50" />
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">Employer 12%</Label>
                                    <p className="text-xs text-muted-foreground italic">Based on Basic</p>
                                </div>
                                <p className="text-lg font-black text-muted-foreground">₹{pfEmployerAmount.toLocaleString()}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tax Deductions */}
                    <Card className="border-muted shadow-sm overflow-hidden border-l-4 border-l-orange-500">
                        <CardHeader className="bg-orange-50/50 border-b border-orange-100">
                            <CardTitle className="text-sm flex items-center gap-2 text-orange-700 font-bold uppercase tracking-tight">
                                <Banknote className="h-4 w-4" /> Tax Deductions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">Professional Tax</Label>
                                    <p className="text-xs text-muted-foreground italic">Deducted from Monthly Gross</p>
                                </div>
                                <p className="text-lg font-black text-orange-600">₹{config.professionalTax.toLocaleString()}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bank & Tax Details */}
                    <Card className="border-muted shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b border-muted">
                            <CardTitle className="text-sm flex items-center gap-2 font-bold uppercase tracking-tight">
                                <Landmark className="h-4 w-4" /> Bank & IDs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Bank Name</Label>
                                    <Input
                                        value={bankDetails.bankName}
                                        onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                        className="h-8 text-sm"
                                        placeholder="e.g. HDFC Bank"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Account Number</Label>
                                    <Input
                                        value={bankDetails.accountNumber}
                                        onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">IFSC Code</Label>
                                        <Input
                                            value={bankDetails.ifscCode}
                                            onChange={e => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">PAN Number</Label>
                                        <Input
                                            value={bankDetails.panNo}
                                            onChange={e => setBankDetails({ ...bankDetails, panNo: e.target.value })}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">UAN / PF No.</Label>
                                    <Input
                                        value={bankDetails.uanNo}
                                        onChange={e => setBankDetails({ ...bankDetails, uanNo: e.target.value })}
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Fixed minor typo landMark to Landmark in SVG
const LandmarkIcon = ({ className }: { className?: string }) => (
    <Landmark className={className} />
);
