/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import type { User } from "../../types/user.type";
import useColumnSearch from "../../hooks/useColumnSearch";
import { getListData } from "../../services/getData.api";
import { createFilterQueryFromArray, formatter } from "../../utils/utils";
import { Col, Row, Space, Tag, Flex } from "antd";
import ChiTietPhieuThu from "./ChiTietPhieuThu";
import Delete from "../../components/Delete";
import { useDispatch, useSelector } from "react-redux";
import CustomTable from "../../components/CustomTable";
import type { RootState } from "../../redux/store";
import { usePagination } from "../../hooks/usePagination";
import type { Actions } from "../../types/main.type";
import ExportTableToExcel from "../../components/ExportTableToExcel";
import {
  OPTIONS_LOAI_PHIEU_THU,
  OPTIONS_PHUONG_THUC_THANH_TOAN,
  OPTIONS_STATUS,
} from "../../utils/constant";
import dayjs from "dayjs";
import ImportExcel from "../../components/ImportExcel";
import { checkIsToday } from "../../helpers/funcHelper";

const DanhSachPhieuThu = ({
  path,
  permission,
  title,
}: {
  path: string;
  permission: Actions;
  title: string;
}) => {
  const dispatch = useDispatch();

  const isReload = useSelector((state: RootState) => state.main.isReload);

  const [danhSach, setDanhSach] = useState<
    { data: User[]; total: number } | undefined
  >({ data: [], total: 0 });
  const { filter, handlePageChange, handleLimitChange } = usePagination({
    page: 1,
    limit: 20,
  });
  const {
    inputSearch,
    query,
    dateSearch,
    selectSearch,
    selectSearchWithOutApi,
  } = useColumnSearch();
  const [isLoading, setIsLoading] = useState(false);

  const getDanhSach = async () => {
    setIsLoading(true);
    const params = { ...filter, ...createFilterQueryFromArray(query) };
    const danhSach = await getListData(path, params);
    if (danhSach) {
      setIsLoading(false);
    }
    setDanhSach(danhSach);
  };

  const defaultColumns: any = [
    {
      title: "STT",
      dataIndex: "index",
      width: 80,
      render: (_text: any, _record: any, index: any) => {
        return filter.limit && (filter.page - 1) * filter.limit + index + 1;
      },
    },
    {
      title: "Thao tác",
      dataIndex: "id",
      align: "center",
      render: (id: number, record: any) => {
        return (
          <Space size={0}>
            {permission.edit && (
              <ChiTietPhieuThu path={path} id={id} title={title} />
            )}
            {permission.delete && checkIsToday(record?.created_at || "") && (
              <Delete path={path} id={id} onShow={getDanhSach} />
            )}
          </Space>
        );
      },
    },
    {
      title: "Mã phiếu thu",
      dataIndex: "ma_phieu_thu",
      ...inputSearch({
        dataIndex: "ma_phieu_thu",
        operator: "contain",
        nameColumn: "Mã phiếu thu",
      }),
    },
    {
      title: "Ngày thu",
      dataIndex: "ngay_thu",
      ...dateSearch({ dataIndex: "ngay_thu", nameColumn: "Ngày thu" }),
      render: (record: string): string => {
        const date = dayjs(record);
        return date.format("DD/MM/YYYY") || "";
      },
    },
    /**
     * CỘT HIỂN THỊ NỘI DUNG GHÉP:
     * - Đổi tiêu đề thành "Phiếu thu" (theo mong muốn hiển thị)
     * - Vẫn filter theo loai_phieu_thu như cũ
     * - Render dùng mo_ta_phieu_thu trả từ API backend
     */
    {
      title: "Phiếu thu",
      dataIndex: "loai_phieu_thu",
      render: (_: any, row: any) => row?.mo_ta_phieu_thu ?? "",
      ...selectSearchWithOutApi({
        dataIndex: "loai_phieu_thu",
        operator: "equal",
        nameColumn: "Loại phiếu thu",
        options: OPTIONS_LOAI_PHIEU_THU,
      }),
    },

{
  title: "Số tiền thu",
  dataIndex: "so_tien",
  width: 160,          // tăng độ rộng cột (có thể 180/200 tùy anh)
  align: "right",      // canh phải cho gọn
  render: (so_tien: number) => (
    <span style={{ whiteSpace: "nowrap" }}>
      {(formatter(so_tien) || 0) + " đ"}
    </span>
  ),
},


    {
      title: "Người thanh toán",
      dataIndex: "nguoi_tra",
      ...inputSearch({
        dataIndex: "nguoi_tra",
        operator: "contain",
        nameColumn: "Người thanh toán",
      }),
    },
    {
      title: "Phương thức thanh toán",
      dataIndex: "phuong_thuc_thanh_toan",
      render: (phuong_thuc_thanh_toan: number) => {
        return OPTIONS_PHUONG_THUC_THANH_TOAN.find(
          (item: any) => item.value === phuong_thuc_thanh_toan
        )?.label;
      },
      ...selectSearchWithOutApi({
        dataIndex: "phuong_thuc_thanh_toan",
        operator: "equal",
        nameColumn: "Phương thức thanh toán",
        options: OPTIONS_PHUONG_THUC_THANH_TOAN,
      }),
    },
    {
      title: "Người tạo",
      dataIndex: "ten_nguoi_tao",
      ...inputSearch({
        dataIndex: "ten_nguoi_tao",
        operator: "contain",
        nameColumn: "Người tạo",
      }),
    },
{
  title: "Ngày tạo",
  dataIndex: "created_at",
  ...dateSearch({ dataIndex: "created_at", nameColumn: "Ngày tạo" }),
  sorter: (a: any, b: any) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
  defaultSortOrder: "descend" as const,
}

  ];

  useEffect(() => {
    getDanhSach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReload, filter, query]);

  return (
    <Row>
      <Col span={24}>
        <Flex vertical gap={10}>
          <Row
            justify="end"
            align="middle"
            style={{ marginBottom: 5, gap: 10 }}
          >
            {permission.export && (
              <ExportTableToExcel
                columns={defaultColumns}
                path={path}
                params={{}}
              />
            )}
            {/* {permission.create && <ImportExcel path={path} />} */}
          </Row>
          <CustomTable
            rowKey="id"
            dataTable={danhSach?.data}
            defaultColumns={defaultColumns}
            filter={filter}
            scroll={{ x: 1000 }}
            handlePageChange={handlePageChange}
            handleLimitChange={handleLimitChange}
            total={danhSach?.total}
            loading={isLoading}
          />
        </Flex>
      </Col>
    </Row>
  );
};

export default DanhSachPhieuThu;
