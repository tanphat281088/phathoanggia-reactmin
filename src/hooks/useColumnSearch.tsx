/* eslint-disable @typescript-eslint/no-explicit-any */
import { SearchOutlined } from "@ant-design/icons";
import SelectApi from "../components/select/SelectApi";

import { Button, DatePicker, Input, Select, Space, Typography } from "antd";
import type { ColumnType } from "antd/es/table";
import { useState } from "react";
import { optionDateTime } from "../configs/select-config";
import dayjs from "dayjs";

interface SearchItem {
    field: string;
    operator: string;
    value: string | number;   // cho phép 0
}


interface IDataSearch {
    dataIndex: string;
    operator?: string;
    filter?: any;
    nameColumn?: string;
}

const useColumnSearch = () => {
    const [searchText, setSearchText] = useState<SearchItem[]>([]);
    const [dateOpetator, setDateOpetator] = useState<any>("between");
    const handleColumnSearch =
        (selectedKeys: any, dataIndex: string, operator: string) => () => {
           const v = selectedKeys[0];
if (v === null || v === undefined || v === "") return;

            const updatedSearchText = searchText.filter(
                (item) => item.field !== dataIndex
            );
            if (operator === "between") {
                if (selectedKeys[0]) {
                    updatedSearchText.push({
                        field: dataIndex,
                        operator: operator,
                        value: JSON.stringify(selectedKeys[0]),
                    });
                }
            } else {
                updatedSearchText.push({
                    field: dataIndex,
                    operator: operator,
                     value: v, 
                });
            }
            setSearchText(updatedSearchText);
        };

    const handleReset = (clearFilters: () => void, dataIndex: string) => {
        const updatedSearchText = searchText.filter(
            (item) => item.field !== dataIndex
        );
        setSearchText(updatedSearchText);
        clearFilters();
    };

    const inputSearch = ({
        dataIndex,
        operator = "contain",
        nameColumn,
    }: IDataSearch): ColumnType<any> => ({
        filterDropdown: ({
            setSelectedKeys,
            selectedKeys,
            clearFilters,
            close,
        }) => (
            <Space
                size={8}
                direction="vertical"
                style={{ padding: 8 }}
                onKeyDown={(e) => e.stopPropagation()}
            >
                {nameColumn && (
                    <Typography.Text style={{ textAlign: "center" }}>
                        <b>Tìm kiếm theo &#34;{nameColumn}&#34;</b>
                    </Typography.Text>
                )}
                <Input
                    placeholder="Nhập nội dung"
                    value={selectedKeys[0] as any}
                    onChange={(e) =>
                        setSelectedKeys(e.target.value ? [e.target.value] : [])
                    }
                    onPressEnter={handleColumnSearch(
                        selectedKeys,
                        dataIndex,
                        operator
                    )}
                />
                <div>
                    <Button
                        type="primary"
                        onClick={handleColumnSearch(
                            selectedKeys,
                            dataIndex,
                            operator
                        )}
                        size="small"
                    >
                        Tìm
                    </Button>
                    &nbsp;
                    <Button
                        onClick={() =>
                            clearFilters && handleReset(clearFilters, dataIndex)
                        }
                        size="small"
                    >
                        Làm mới
                    </Button>
                    <Button
                        type="text"
                        size="small"
                        onClick={() => {
                            close();
                        }}
                    >
                        Đóng
                    </Button>
                </div>
            </Space>
        ),
        filterIcon: (filtered: boolean) => (
            <SearchOutlined
                style={{ color: filtered ? "#1890ff" : undefined }}
            />
        ),
    });

    const selectSearch = ({
        dataIndex,
        path,
        operator = "equal",
        filter,
        nameColumn,
    }: {
        dataIndex: string;
        path: string;
        operator?: string;
        filter?: any;
        nameColumn?: string;
    }): ColumnType<any> => {
        return {
            filterDropdown: ({
                setSelectedKeys,
                selectedKeys,
                clearFilters,
                close,
            }: any) => (
                <Space
                    size={8}
                    direction="vertical"
                    style={{ padding: 8 }}
                    onKeyDown={(e) => e.stopPropagation()}
                >
                    {nameColumn && (
                        <Typography.Text style={{ textAlign: "center" }}>
                            <b>Tìm kiếm theo &#34;{nameColumn}&#34;</b>
                        </Typography.Text>
                    )}
                    <SelectApi
                        style={{
                            marginBottom: 8,
                            display: "block",
                            minWidth: 210,
                        }}
                   onChange={(e) => setSelectedKeys(e === 0 || e === "0" || e ? [e] : [])}

                        placeholder="Chọn"
                        value={selectedKeys[0]}
                        path={path}
                        filter={filter}
                        allowClear
                    />
                    <div>
                        <Button
                            type="primary"
                            onClick={handleColumnSearch(
                                selectedKeys,
                                dataIndex,
                                operator
                            )}
                            size="small"
                        >
                            Tìm
                        </Button>
                        &nbsp;
                        <Button
                            onClick={() => {
                                if (clearFilters) {
                                    handleReset(clearFilters, dataIndex);
                                }
                                selectedKeys[0] = null;
                            }}
                            size="small"
                        >
                            Làm mới
                        </Button>
                        <Button
                            type="text"
                            size="small"
                            onClick={() => {
                                close();
                            }}
                        >
                            Đóng
                        </Button>
                    </div>
                </Space>
            ),
            filterIcon: (filtered: boolean) => (
                <SearchOutlined
                    style={{ color: filtered ? "#1890ff" : undefined }}
                />
            ),
        };
    };

    const dateSearch = ({
        dataIndex,
        nameColumn,
        type = "date",
    }: {
        dataIndex: string;
        nameColumn?: string;
        type?: "date" | "dateTime";
    }) => {
        return {
            filterDropdown: ({
                setSelectedKeys,
                selectedKeys,
                clearFilters,
                close,
            }: any) => (
                <Space
                    direction="vertical"
                    size={8}
                    style={{ padding: 8 }}
                    onKeyDown={(e) => e.stopPropagation()}
                >
                    {nameColumn && (
                        <Typography.Text style={{ textAlign: "center" }}>
                            <b>Tìm kiếm theo &#34;{nameColumn}&#34;</b>
                        </Typography.Text>
                    )}
                    <Select
                        style={{ display: "block" }}
                        options={optionDateTime}
                        size="small"
                        placeholder="Chọn ngày"
                        allowClear
                        value={dateOpetator}
                        onChange={(value) => {
                            setDateOpetator(value);
                            selectedKeys[0] = null;
                        }}
                    />
                    <div>
                        {dateOpetator === "between" ? (
                            <DatePicker.RangePicker
                                showTime={type === "dateTime"}
                                size="small"
                                onChange={(e: any) =>
                                    setSelectedKeys(
                                        e
                                            ? type === "dateTime"
                                                ? [
                                                      [
                                                          dayjs(e[0]).format(
                                                              "YYYY-MM-DD HH:mm:00"
                                                          ),
                                                          dayjs(e[1]).format(
                                                              "YYYY-MM-DD HH:mm:00"
                                                          ),
                                                      ],
                                                  ]
                                                : [
                                                      [
                                                          dayjs(e[0]).format(
                                                              "YYYY-MM-DD 00:00:00"
                                                          ),
                                                          dayjs(e[1]).format(
                                                              "YYYY-MM-DD 00:00:00"
                                                          ),
                                                      ],
                                                  ]
                                            : []
                                    )
                                }
                                placeholder={["Từ ngày", "Đến ngày"]}
                                style={{ width: "100%" }}
                                format={
                                    type === "dateTime"
                                        ? "DD/MM/YYYY HH:mm"
                                        : "DD/MM/YYYY"
                                }
                                value={
                                    selectedKeys[0] && [
                                        dayjs(selectedKeys[0][0]),
                                        dayjs(selectedKeys[0][1]),
                                    ]
                                }
                            />
                        ) : (
                            <DatePicker
                                onChange={(e: any) =>
                                    setSelectedKeys(
                                        e ? [dayjs(e).format("YYYY-MM-DD")] : []
                                    )
                                }
                                size="small"
                                format="DD/MM/YYYY"
                                placeholder="Chọn ngày"
                                value={
                                    selectedKeys[0] && dayjs(selectedKeys[0])
                                }
                            />
                        )}
                    </div>
                    <div>
                        <Button
                            type="primary"
                            onClick={handleColumnSearch(
                                selectedKeys,
                                dataIndex,
                                dateOpetator
                            )}
                            size="small"
                        >
                            Tìm
                        </Button>
                        &nbsp;
                        <Button
                            onClick={() => {
                                if (clearFilters) {
                                    handleReset(clearFilters, dataIndex);
                                }
                                selectedKeys[0] = null;
                            }}
                            size="small"
                        >
                            Làm mới
                        </Button>
                        <Button
                            type="text"
                            size="small"
                            onClick={() => {
                                close();
                            }}
                        >
                            Đóng
                        </Button>
                    </div>
                </Space>
            ),
            filterIcon: (filtered: boolean) => (
                <SearchOutlined
                    style={{ color: filtered ? "#1890ff" : undefined }}
                />
            ),
        };
    };

    const selectSearchWithOutApi = ({
        dataIndex,
        operator = "equal",
        options,
        nameColumn,
    }: {
        dataIndex: string;
        operator?: "equal" | "contain";
        options: { value: string | number; label: string }[];
        nameColumn?: string;
    }) => {
        return {
            filterDropdown: ({
                setSelectedKeys,
                selectedKeys,
                clearFilters,
                close,
            }: any) => (
                <Space
                    direction="vertical"
                    style={{ padding: 8 }}
                    size={8}
                    onKeyDown={(e) => e.stopPropagation()}
                >
                    {nameColumn && (
                        <Typography.Text style={{ textAlign: "center" }}>
                            <b>Tìm kiếm theo &#34;{nameColumn}&#34;</b>
                        </Typography.Text>
                    )}
                    <Select
                        style={{ marginBottom: 8, display: "block" }}
                 onChange={(e) => setSelectedKeys(e === 0 || e === "0" || e ? [e] : [])}

                        placeholder="Chọn"
                        value={selectedKeys[0]}
                        options={options}
                        allowClear
                    />
                    <div>
                        <Button
                            type="primary"
                            onClick={handleColumnSearch(
                                selectedKeys,
                                dataIndex,
                                operator
                            )}
                            size="small"
                        >
                            Tìm
                        </Button>
                        &nbsp;
                        <Button
                            onClick={() => {
                                if (clearFilters) {
                                    handleReset(clearFilters, dataIndex);
                                }
                            }}
                            size="small"
                        >
                            Làm mới
                        </Button>
                        <Button
                            type="text"
                            size="small"
                            onClick={() => {
                                close();
                            }}
                        >
                            Đóng
                        </Button>
                    </div>
                </Space>
            ),
            filterIcon: (filtered: boolean) => (
                <SearchOutlined
                    style={{ color: filtered ? "#1890ff" : undefined }}
                />
            ),
        };
    };

    return {
        inputSearch,
        query: searchText,
        selectSearch,
        selectSearchWithOutApi,
        dateSearch,
    };
};

export default useColumnSearch;
