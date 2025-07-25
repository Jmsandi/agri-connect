import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

interface UploadResult {
  success: number;
  errors: ValidationError[];
  total: number;
}

interface BulkUploadProps {
  vendorId: string;
  onSuccess: () => void;
}

interface CSVRow {
  name: string;
  description: string;
  price: string;
  unit: string;
  stock_quantity: string;
  category_name: string;
  is_active: string;
}

const CSV_TEMPLATE = `name,description,price,unit,stock_quantity,category_name,is_active
"Fresh Tomatoes","Organic red tomatoes from local farm",2.50,kg,100,Vegetables,true
"Basmati Rice","Premium quality basmati rice",5.99,kg,50,Grains,true
"Green Beans","Fresh green beans",3.25,kg,75,Vegetables,true`;

export const BulkUpload = ({ vendorId, onSuccess }: BulkUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (csvText: string): CSVRow[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const expectedHeaders = ['name', 'description', 'price', 'unit', 'stock_quantity', 'category_name', 'is_active'];
    
    // Validate headers
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const row: any = {};
      
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      
      return row as CSVRow;
    });
  };

  const validateRow = (row: CSVRow, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Required fields validation
    if (!row.name.trim()) {
      errors.push({
        row: rowIndex + 2, // +2 because of header and 0-based index
        field: 'name',
        message: 'Product name is required',
        value: row.name
      });
    }

    if (!row.price.trim()) {
      errors.push({
        row: rowIndex + 2,
        field: 'price',
        message: 'Price is required',
        value: row.price
      });
    } else {
      const price = parseFloat(row.price);
      if (isNaN(price) || price <= 0) {
        errors.push({
          row: rowIndex + 2,
          field: 'price',
          message: 'Price must be a positive number',
          value: row.price
        });
      }
    }

    if (!row.unit.trim()) {
      errors.push({
        row: rowIndex + 2,
        field: 'unit',
        message: 'Unit is required',
        value: row.unit
      });
    }

    if (!row.stock_quantity.trim()) {
      errors.push({
        row: rowIndex + 2,
        field: 'stock_quantity',
        message: 'Stock quantity is required',
        value: row.stock_quantity
      });
    } else {
      const quantity = parseInt(row.stock_quantity);
      if (isNaN(quantity) || quantity < 0) {
        errors.push({
          row: rowIndex + 2,
          field: 'stock_quantity',
          message: 'Stock quantity must be a non-negative number',
          value: row.stock_quantity
        });
      }
    }

    if (!row.category_name.trim()) {
      errors.push({
        row: rowIndex + 2,
        field: 'category_name',
        message: 'Category name is required',
        value: row.category_name
      });
    }

    // Boolean validation for is_active
    const isActiveValue = row.is_active.toLowerCase();
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(isActiveValue)) {
      errors.push({
        row: rowIndex + 2,
        field: 'is_active',
        message: 'is_active must be true/false, 1/0, or yes/no',
        value: row.is_active
      });
    }

    return errors;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await file.text();
      const data = parseCSV(text);
      setCsvData(data);
      
      toast({
        title: "File loaded",
        description: `${data.length} rows loaded for validation`,
      });
    } catch (error) {
      toast({
        title: "Error parsing CSV",
        description: error instanceof Error ? error.message : "Invalid CSV format",
        variant: "destructive",
      });
    }
  };

  const processUpload = async () => {
    if (csvData.length === 0) {
      toast({
        title: "No data",
        description: "Please upload a CSV file first",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadResult(null);

    try {
      // First, get all categories to map names to IDs
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name');

      if (categoriesError) throw categoriesError;

      const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase(), c.id]) || []);

      // Validate all rows
      const allErrors: ValidationError[] = [];
      const validRows: any[] = [];

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const errors = validateRow(row, i);
        
        // Check if category exists
        const categoryId = categoryMap.get(row.category_name.toLowerCase());
        if (!categoryId) {
          errors.push({
            row: i + 2,
            field: 'category_name',
            message: `Category "${row.category_name}" not found`,
            value: row.category_name
          });
        }

        if (errors.length > 0) {
          allErrors.push(...errors);
        } else {
          // Convert row to database format
          const isActive = ['true', '1', 'yes'].includes(row.is_active.toLowerCase());
          validRows.push({
            vendor_id: vendorId,
            name: row.name.trim(),
            description: row.description.trim() || null,
            price: parseFloat(row.price),
            unit: row.unit.trim(),
            stock_quantity: parseInt(row.stock_quantity),
            category_id: categoryId,
            is_active: isActive,
          });
        }

        setProgress(((i + 1) / csvData.length) * 50); // First 50% for validation
      }

      // If there are validation errors, stop here
      if (allErrors.length > 0) {
        setUploadResult({
          success: 0,
          errors: allErrors,
          total: csvData.length
        });
        setUploading(false);
        return;
      }

      // Insert valid rows in batches
      const batchSize = 50;
      let successCount = 0;
      const insertErrors: ValidationError[] = [];

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        
        try {
          const { error } = await supabase
            .from('products')
            .insert(batch);

          if (error) {
            // Handle individual row errors
            batch.forEach((_, batchIndex) => {
              insertErrors.push({
                row: i + batchIndex + 2,
                field: 'general',
                message: error.message,
                value: ''
              });
            });
          } else {
            successCount += batch.length;
          }
        } catch (error) {
          batch.forEach((_, batchIndex) => {
            insertErrors.push({
              row: i + batchIndex + 2,
              field: 'general',
              message: error instanceof Error ? error.message : 'Unknown error',
              value: ''
            });
          });
        }

        setProgress(50 + ((i + batch.length) / validRows.length) * 50); // Second 50% for insertion
      }

      setUploadResult({
        success: successCount,
        errors: insertErrors,
        total: csvData.length
      });

      if (successCount > 0) {
        toast({
          title: "Upload completed",
          description: `${successCount} products uploaded successfully`,
        });
        onSuccess();
      }

    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  const resetUpload = () => {
    setCsvData([]);
    setUploadResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Product Upload</DialogTitle>
          <DialogDescription>
            Upload multiple products at once using a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-4 w-4" />
                Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>1. Download the CSV template below</p>
                <p>2. Fill in your product data following the template format</p>
                <p>3. Upload your completed CSV file</p>
                <p>4. Review any validation errors and fix them</p>
                <p>5. Click "Process Upload" to add products to your inventory</p>
              </div>
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Upload CSV File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to select CSV file or drag and drop
                    </p>
                  </div>
                </label>

                {csvData.length > 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {csvData.length} rows loaded and ready for processing
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {uploading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {uploadResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {uploadResult.errors.length === 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  Upload Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{uploadResult.success}</div>
                      <div className="text-sm text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{uploadResult.errors.length}</div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{uploadResult.total}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                  </div>

                  {uploadResult.errors.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          Validation Errors
                        </h4>
                        <ScrollArea className="h-48 border rounded-md p-3">
                          <div className="space-y-2">
                            {uploadResult.errors.map((error, index) => (
                              <div key={index} className="text-sm">
                                <Badge variant="destructive" className="mr-2">
                                  Row {error.row}
                                </Badge>
                                <span className="font-medium">{error.field}:</span> {error.message}
                                {error.value && (
                                  <span className="text-muted-foreground"> (value: "{error.value}")</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button onClick={resetUpload} variant="outline">
              Reset
            </Button>
            <div className="space-x-2">
              <Button onClick={() => setIsOpen(false)} variant="outline">
                Close
              </Button>
              <Button 
                onClick={processUpload} 
                disabled={uploading || csvData.length === 0}
              >
                {uploading ? "Processing..." : "Process Upload"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
