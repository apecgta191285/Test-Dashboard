import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { GlobalDateRangePicker } from './GlobalDateRangePicker';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardHeaderProps {
    onExportCSV: () => void;
    onExportPDF: () => void;
    isExporting?: boolean;
}

export function DashboardHeader({ onExportCSV, onExportPDF, isExporting }: DashboardHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">Dashboard Overview</h1>
                <p className="text-sm text-slate-500 mt-1">Real-time performance metrics across your channels.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <GlobalDateRangePicker />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={onExportCSV} disabled={isExporting} className="cursor-pointer">
                            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                            <span>Export CSV</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onExportPDF} disabled={isExporting} className="cursor-pointer">
                            <FileText className="mr-2 h-4 w-4 text-red-600" />
                            <span>Export PDF</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
