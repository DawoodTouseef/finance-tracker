import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import backend from "~backend/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";

interface CsvImportDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportMapping {
  dateColumn: number;
  descriptionColumn: number;
  amountColumn: number;
  categoryColumn?: number;
}

export default function CsvImportDialog({ onClose, onSuccess }: CsvImportDialogProps) {
  const [csvData, setCsvData] = useState("");
  const [mapping, setMapping] = useState<ImportMapping>({
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2,
  });
  const [defaultCategoryId, setDefaultCategoryId] = useState<number | undefined>();
  const [skipFirstRow, setSkipFirstRow] = useState(true);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "result">("upload");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => backend.finance.listCategories(),
  });

  const importMutation = useMutation({
    mutationFn: (data: any) => backend.finance.importCsv(data),
    onSuccess: (result) => {
      setImportResult(result);
      setStep("result");
      if (result.successfulImports > 0) {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
      }
    },
    onError: (error: any) => {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error?.message || "Failed to import CSV data",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
      
      // Parse first few rows for preview
      const lines = content.trim().split('\n').slice(0, 5);
      const rows = lines.map(line => parseCSVRow(line));
      setPreviewRows(rows);
      
      setStep("mapping");
    };
    reader.readAsText(file);
  };

  const handleTextareaChange = (value: string) => {
    setCsvData(value);
    if (value.trim()) {
      const lines = value.trim().split('\n').slice(0, 5);
      const rows = lines.map(line => parseCSVRow(line));
      setPreviewRows(rows);
      setStep("mapping");
    }
  };

  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const handleImport = () => {
    if (!csvData.trim()) {
      toast({
        title: "Error",
        description: "Please provide CSV data",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({
      csvData,
      mapping,
      defaultCategoryId,
      skipFirstRow,
    });
  };

  const handleClose = () => {
    if (importResult?.successfulImports > 0) {
      onSuccess();
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="file-upload">Upload CSV File</Label>
              <div className="mt-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>
            </div>

            <div className="text-center text-gray-500">
              <span>or</span>
            </div>

            <div>
              <Label htmlFor="csv-text">Paste CSV Data</Label>
              <Textarea
                id="csv-text"
                placeholder="Date,Description,Amount,Category&#10;2024-01-01,Grocery Store,45.67,Food&#10;2024-01-02,Gas Station,32.10,Transportation"
                value={csvData}
                onChange={(e) => handleTextareaChange(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CSV Format Requirements</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Date column: YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY format</p>
                <p>• Amount column: Positive numbers (currency symbols will be removed)</p>
                <p>• Description column: Transaction description</p>
                <p>• Category column: Optional, must match existing category names</p>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Map CSV Columns</h3>
              
              {previewRows.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-sm">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            {previewRows[0]?.map((_, index) => (
                              <th key={index} className="text-left p-2 border-b">
                                Column {index}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="p-2 border-b">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date Column</Label>
                  <Select
                    value={mapping.dateColumn.toString()}
                    onValueChange={(value) => 
                      setMapping({ ...mapping, dateColumn: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {previewRows[0]?.map((_, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          Column {index} {previewRows[0]?.[index] && `(${previewRows[0][index]})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description Column</Label>
                  <Select
                    value={mapping.descriptionColumn.toString()}
                    onValueChange={(value) => 
                      setMapping({ ...mapping, descriptionColumn: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {previewRows[0]?.map((_, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          Column {index} {previewRows[0]?.[index] && `(${previewRows[0][index]})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Amount Column</Label>
                  <Select
                    value={mapping.amountColumn.toString()}
                    onValueChange={(value) => 
                      setMapping({ ...mapping, amountColumn: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {previewRows[0]?.map((_, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          Column {index} {previewRows[0]?.[index] && `(${previewRows[0][index]})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category Column (Optional)</Label>
                  <Select
                    value={mapping.categoryColumn?.toString() || "none"}
                    onValueChange={(value) => 
                      setMapping({ 
                        ...mapping, 
                        categoryColumn: value === "none" ? undefined : parseInt(value) 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {previewRows[0]?.map((_, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          Column {index} {previewRows[0]?.[index] && `(${previewRows[0][index]})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <Label>Default Category</Label>
                <Select
                  value={defaultCategoryId?.toString() || ""}
                  onValueChange={(value) => 
                    setDefaultCategoryId(value ? parseInt(value) : undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                          <span className="text-xs text-gray-500">({category.type})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="skip-first-row"
                  checked={skipFirstRow}
                  onCheckedChange={(checked) => setSkipFirstRow(checked as boolean)}
                />
                <Label htmlFor="skip-first-row">Skip first row (headers)</Label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending ? "Importing..." : "Import Transactions"}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && importResult && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Import Complete</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{importResult.totalRows}</div>
                  <div className="text-sm text-gray-600">Total Rows</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.successfulImports}</div>
                  <div className="text-sm text-gray-600">Imported</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.duplicatesSkipped}</div>
                  <div className="text-sm text-gray-600">Duplicates</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                  <div className="text-sm text-gray-600">Errors</div>
                </CardContent>
              </Card>
            </div>

            {importResult.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span>Import Errors</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((error: string, index: number) => (
                      <div key={index} className="text-sm text-red-600">
                        {error}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
