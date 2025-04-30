import maxminddb
import os
from pathlib import Path

def read_mmdb_metadata(file_path):
    print(f"\n=== 读取文件: {os.path.basename(file_path)} ===")
    try:
        with maxminddb.open_database(file_path) as reader:
            metadata = reader.metadata()
            print(f"数据库类型: {metadata.database_type}")
            print(f"IP版本: {metadata.ip_version}")
            print(f"节点数量: {metadata.node_count}")
            print(f"记录大小: {metadata.record_size}")
            print(f"构建时间: {metadata.build_epoch}")
            print(f"描述: {metadata.description}")
            
            # 测试一个示例 IP
            test_ip = "8.8.8.8"
            result = reader.get(test_ip)
            print(f"\n示例IP ({test_ip}) 查询结果:")
            print(result)
    except Exception as e:
        print(f"读取文件时出错: {str(e)}")

def main():
    db_dir = Path("data/db")
    mmdb_files = list(db_dir.glob("*.mmdb"))
    
    for mmdb_file in mmdb_files:
        read_mmdb_metadata(str(mmdb_file))

if __name__ == "__main__":
    main() 
