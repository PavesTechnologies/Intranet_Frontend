import sys

file_path = r"c:\Users\Lokeshwari.Busam\Desktop\Myfiles\projects\intranet-fe\src\pages\employee-onboarding\employeedocuments\EmployeeDocuments.jsx"

try:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Change base neutral color
    content = content.replace("slate-", "zinc-")
    
    # Change primary colors
    content = content.replace("indigo-", "violet-")
    content = content.replace("blue-", "pink-")
    content = content.replace("cyan-", "rose-")
    
    # Modernize border radius
    # To prevent round-3xl replacing 2xl then getting double replaced, do:
    content = content.replace("rounded-2xl", "temp-rounded-3xl")
    content = content.replace("rounded-xl", "rounded-2xl")
    content = content.replace("temp-rounded-3xl", "rounded-3xl")
    
    # Increase blur strength for background blobs
    content = content.replace("blur-3xl", "blur-[100px]")
    
    # Specific targeted improvements for glassmorphism
    content = content.replace(
        "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]", 
        "bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50"
    )
    
    content = content.replace(
        "bg-gradient-to-r from-zinc-50 to-white",
        "bg-gradient-to-r from-zinc-50/50 to-white/50 backdrop-blur-md"
    )
    
    content = content.replace(
        "bg-zinc-50/80",
        "bg-zinc-50/50 backdrop-blur-md"
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("UI updated successfully.")
except Exception as e:
    print(f"Error: {e}")
