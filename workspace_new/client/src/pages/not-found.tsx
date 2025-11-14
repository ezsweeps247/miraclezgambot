import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className=" text-red-500"style={{width: '3.5px', height: '3.5px'}} />
            <h1 className="text-[10px] font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-[8px] text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
