import { useMemo, useState } from "react";
import { Award, Calendar, Building2, Clock, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Pagination from "../../../../components/Pagination/pagination";

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATIONS TAB — Inventory Layer
// Mapped to API: certifications[] = { certificateName, providerName, expiryDate, isActive }
// ═══════════════════════════════════════════════════════════════════════════════

export default function CertificationsTab({ resource }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    const allCerts = useMemo(() => {
        if (!resource.certifications || resource.certifications.length === 0) return [];
        return resource.certifications.map((c, i) => {
            if (typeof c === "string") return { id: i, name: c, provider: "Internal/Verified", expiry: null, status: true };
            return {
                id: i,
                name: c.certificateName || c.name || "Unknown Credential",
                provider: c.providerName || "Verified Issuer",
                expiry: c.expiryDate || null,
                status: c.isActive !== undefined ? c.isActive : true
            };
        });
    }, [resource.certifications]);

    const filtered = useMemo(() => {
        if (!search.trim()) return allCerts;
        const q = search.toLowerCase();
        return allCerts.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.provider.toLowerCase().includes(q)
        );
    }, [allCerts, search]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginatedCerts = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
    }, [filtered, page]);

    if (allCerts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-100 rounded-3xl font-sans">
                <Award className="h-12 w-12 text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-400">Credential Vault Empty</p>
                <p className="text-xs text-slate-300 mt-1">No verified certifications detected for this resource</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-xs group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search credentials..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full h-9 pl-10 pr-4 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm font-sans"
                    />
                </div>
                <Badge variant="outline" className="h-7 px-3 text-xs font-bold bg-indigo-50 text-indigo-600 border-indigo-100 rounded-full font-sans whitespace-nowrap">
                    {filtered.length} Records
                </Badge>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {paginatedCerts.map((cert) => {
                    const isExpired = cert.expiry && new Date(cert.expiry) < new Date();

                    return (
                        <div
                            key={cert.id}
                            className="group relative rounded-xl border border-slate-200 bg-white p-3 hover:border-indigo-300 hover:shadow-md transition-all duration-300 cursor-default overflow-hidden shadow-sm flex flex-col h-full"
                        >
                            <div className="flex items-start justify-between mb-3 border-b border-slate-50 pb-2">
                                <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                    <Award className="h-4.5 w-4.5 text-indigo-500" />
                                </div>
                                <div className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase border",
                                    cert.status && !isExpired ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                )}>
                                    {isExpired ? "Expired" : cert.status ? "Active" : "Inactive"}
                                </div>
                            </div>

                            <div className="flex-1 space-y-2">
                                <h4 className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-2 font-sans min-h-[1.5rem]">
                                    {cert.name}
                                </h4>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <Building2 className="h-3 w-3 shrink-0" />
                                        <span className="text-[9px] font-bold truncate uppercase tracking-tight">{cert.provider}</span>
                                    </div>

                                    {cert.expiry && (
                                        <div className={cn(
                                            "flex items-center gap-1.5",
                                            isExpired ? "text-rose-500" : "text-slate-400"
                                        )}>
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            <span className="text-[9px] font-bold font-sans">
                                                {new Date(cert.expiry).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Verified</span>
                                {cert.status && !isExpired ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                ) : (
                                    <AlertCircle className="h-3 w-3 text-rose-500" />
                                )}
                            </div>
                        </div>
                    );
                })}
                {paginatedCerts.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 font-medium font-sans border-2 border-dashed border-slate-100 rounded-xl">
                        No matching credentials
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPrevious={() => setPage(p => Math.max(1, p - 1))}
                        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
                    />
                </div>
            )}
        </div>
    );
}
