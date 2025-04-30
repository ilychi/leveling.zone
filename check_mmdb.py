import maxminddb
import sys
import json

def check_mmdb(file_path, ip):
    print(f"\n=== 检查文件: {file_path} ===")
    try:
        with maxminddb.open_database(file_path) as reader:
            metadata = reader.metadata()
            print(f"数据库类型: {metadata.database_type}")
            print(f"IP版本: {metadata.ip_version}")
            print(f"节点数量: {metadata.node_count}")
            print(f"记录大小: {metadata.record_size}")
            print(f"构建时间: {metadata.build_epoch}")
            print(f"描述: {metadata.description}")
            
            result = reader.get(ip)
            print(f"\n示例IP ({ip}) 查询结果:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"读取文件时出错: {str(e)}")

if __name__ == "__main__":
    check_mmdb("data/db/dbip-asn-lite.mmdb", "209.209.56.165") 
