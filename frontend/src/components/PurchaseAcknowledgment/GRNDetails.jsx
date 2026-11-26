import React from 'react'
import CustomContainer from '../CustomContainer';
import AgGrid from '../AgGrid';
import { Box, Stat, Wrap } from '@chakra-ui/react';

function InfoCard({ title, value }) {
    return <Stat.Root>
        <Stat.Label color="brand500">{title}</Stat.Label>
        <Stat.ValueText color="brand800">
            {value}
        </Stat.ValueText>
    </Stat.Root>
}

function GRNDetails({ grn }) {

    if (!grn) return null;

    return (
        <CustomContainer title="GRN Details" size="sm">
            <Wrap>
                <InfoCard title="GRN ID" value={grn.grn_id} />
                <InfoCard title="Handled By" value={grn.employee?.employee_name || "-"} />
                {grn.is_product_stock_missing && <>
                    <InfoCard title="Missing Qty" value={grn.missing_qty} />
                    <InfoCard title="Missing value" value={grn.missing_value} />
                </>}
            </Wrap>
        </CustomContainer>
    )
}

export default GRNDetails